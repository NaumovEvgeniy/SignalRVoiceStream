using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace SignalRVoiceStream.Services
{
    public class StreamManager
    {
        private readonly Channel<double[]> _channel;
        private long _globalClientId;

        public StreamManager()
        {
            _channel = Channel.CreateBounded<double[]>(2);
        }

        public async Task RunStreamAsync(string connectionId, IAsyncEnumerable<double[]> stream)
        {
            await Task.Yield();

            try
            {
                await foreach (var item in stream)
                {
                    try
                    {
                        await viewer.Value.Writer.WriteAsync(item);
                    }
                    catch { }
                }
            }
            finally
            {
                RemoveStream(connectionId);
            }
        }

        public void RemoveStream(string streamName)
        {
            _streams.TryRemove(streamName, out var streamHolder);
            foreach (var viewer in streamHolder.Viewers)
            {
                viewer.Value.Writer.TryComplete();
            }
        }

        public IAsyncEnumerable<double[]> Subscribe(string streamName, CancellationToken cancellationToken)
        {
            if (!_streams.TryGetValue(streamName, out var source))
            {
                throw new HubException("stream doesn't exist");
            }

            var id = Interlocked.Increment(ref _globalClientId);

            var channel = Channel.CreateBounded<double[]>(options: new BoundedChannelOptions(2)
            {
                FullMode = BoundedChannelFullMode.DropOldest
            });

            source.Viewers.TryAdd(id, channel);

            // Register for client closing stream, this token will always fire (handled by SignalR)
            cancellationToken.Register(() =>
            {
                source.Viewers.TryRemove(id, out _);
            });

            return channel.Reader.ReadAllAsync();
        }

        private class StreamHolder
        {
            public IAsyncEnumerable<double[]> Source;
            public ConcurrentDictionary<long, Channel<double[]>> Viewers = new ConcurrentDictionary<long, Channel<double[]>>();
        }
    }
}