using System;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace SignalRVoiceStream.Hubs
{
    public class StreamHub : Hub
    {
        public async Task VoiceStream(ChannelReader<double[]> stream)
        {
            Console.WriteLine("Get voice stream");
            while (await stream.WaitToReadAsync())
            {
                // while (stream.TryRead(out var item))
                // {
                    // do something with the stream item
                    // Console.WriteLine(item.);
                // }
            }
        } 
    }
}