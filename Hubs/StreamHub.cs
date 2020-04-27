using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using SignalRVoiceStream.Services;

namespace SignalRVoiceStream.Hubs
{
    public class StreamHub : Hub
    {
        private readonly StreamManager _streamManager;

        public StreamHub(StreamManager streamManager)
        {
            _streamManager = streamManager;
        }
        
        public IAsyncEnumerable<string> WatchStream(CancellationToken cancellationToken)
        {
            return _streamManager.Subscribe(streamName, cancellationToken);
        }

        public async Task StartVoiceStream(IAsyncEnumerable<double[]> stream)
        {
            try
            {

                var streamTask = _streamManager.RunStreamAsync(Context.ConnectionId, stream);

                // Tell everyone about your stream!
                await Clients.Others.SendAsync("NewStream", Context.ConnectionId);

                // await streamTask;
            }
            finally
            {
                await Clients.Others.SendAsync("RemoveStream", Context.ConnectionId);
            }
        } 
    }
}