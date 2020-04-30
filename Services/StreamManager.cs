using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using SignalRVoiceStream.Pages;

namespace SignalRVoiceStream.Services
{
    public class StreamManager
    {
        private readonly Dictionary<string, Channel<string>> _streams = new Dictionary<string, Channel<string>>();

        public async Task RunStreamAsync(string connectionId, IAsyncEnumerable<string> stream)
        {

            // Add before yielding
            // This fixes a race where we tell clients a new stream arrives before adding the stream
            var channel = Channel.CreateBounded<string>(options: new BoundedChannelOptions(2));
            _streams.Add(connectionId, channel);

            try
            {
                await foreach (var item in stream)
                {
                    var streamsExceptMine = GetStreamsExcept(connectionId);
                    foreach (var otherChannel in streamsExceptMine)
                    {
                        await otherChannel.Writer.WriteAsync(item);
                    }
                }
            }
            finally
            {
                RemoveStream(connectionId);
            }
        }

        private List<Channel<string>> GetStreamsExcept(string connectionId)
        {
            return _streams
                .Where(kv => kv.Key != connectionId)
                .Select(kv => kv.Value)
                .ToList();
        }

        public void RemoveStream(string connectionId)
        {
            _streams.Remove(connectionId);
        }

        public IAsyncEnumerable<string> Subscribe(string connectionId, CancellationToken cancellationToken)
        {
            if (!_streams.TryGetValue(connectionId, out var channel))
            {
                throw new HubException("");
            }

            // Register for client closing stream, this token will always fire (handled by SignalR)
            cancellationToken.Register(() =>
            {
                RemoveStream(connectionId);
            });

            return channel.Reader.ReadAllAsync(cancellationToken);
        }
    }
}