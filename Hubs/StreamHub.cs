using System;
using System.Collections.Generic;
using System.Threading;
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
            return _streamManager.Subscribe(Context.ConnectionId, cancellationToken);
        }

        public async Task StartVoiceStream(IAsyncEnumerable<string> stream)
        {
            await _streamManager.RunStreamAsync(Context.ConnectionId, stream);
        } 
    }
}