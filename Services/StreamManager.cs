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

        public StreamManager()
        {
            _channel = Channel.CreateBounded<double[]>(2);
        }

        public async Task RunStreamAsync(string connectionId, IAsyncEnumerable<double[]> stream)
        {
            await Task.Yield();

            await foreach (var item in stream)
            {
                try
                {
                    await _channel.Writer.WriteAsync(item);
                }
                catch
                {
                    // ignored
                }
            }
        }

        public IAsyncEnumerable<double[]> Subscribe(CancellationToken cancellationToken)
        {
            if (_channel == null)
            {
                throw new HubException("stream doesn't exist");
            }

            return _channel.Reader.ReadAllAsync(cancellationToken);
        }
    }
}