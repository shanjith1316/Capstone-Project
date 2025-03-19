using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using FullStackApp.Server.Data;
using FullStackApp.Server.Models;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using FullStackApp.Server.Hubs;

namespace FullStackApp.Server.Controllers
{
    [ApiController]
    [Route("api/messages")]
    [Authorize]
    public class MessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<ChatHub> _chatHub;

        public MessagesController(ApplicationDbContext context, IHubContext<ChatHub> chatHub)
        {
            _context = context;
            _chatHub = chatHub;
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] Message message)
        {
            if (message == null || string.IsNullOrEmpty(message.Content))
            {
                return BadRequest(new { error = "Message content cannot be empty." });
            }

            var senderIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (senderIdClaim == null || !int.TryParse(senderIdClaim.Value, out int senderId))
            {
                return Unauthorized(new { error = "Invalid token or user ID." });
            }

            message.SenderId = senderId;
            message.Timestamp = DateTime.UtcNow;

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var senderUsername = await _context.Users
                .Where(u => u.Id == senderId)
                .Select(u => u.Username)
                .FirstOrDefaultAsync();

            var receiverUsername = await _context.Users
                .Where(u => u.Id == message.ReceiverId)
                .Select(u => u.Username)
                .FirstOrDefaultAsync();

            var messageDto = new
            {
                SenderId = senderId,
                SenderUsername = senderUsername,
                ReceiverId = message.ReceiverId,
                ReceiverUsername = receiverUsername,
                Content = message.Content,
                Timestamp = message.Timestamp
            };

            await _chatHub.Clients.User(message.ReceiverId.ToString()).SendAsync("ReceiveMessage", messageDto);

            return Ok(new { message = "Message sent successfully!", data = messageDto });
        }

        [HttpGet("{receiverId}")]
        public async Task<IActionResult> GetChatHistory(int receiverId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized("User is not authenticated.");
            }

            int senderId = int.Parse(userIdClaim.Value);

            var messages = await _context.Messages
                .Where(m => (m.SenderId == senderId && m.ReceiverId == receiverId) ||
                            (m.SenderId == receiverId && m.ReceiverId == senderId))
                .OrderBy(m => m.Timestamp)
                .Select(m => new
                {
                    SenderId = m.SenderId,
                    SenderUsername = _context.Users.Where(u => u.Id == m.SenderId).Select(u => u.Username).FirstOrDefault(),
                    ReceiverId = m.ReceiverId,
                    ReceiverUsername = _context.Users.Where(u => u.Id == m.ReceiverId).Select(u => u.Username).FirstOrDefault(),
                    Content = m.Content,
                    Timestamp = m.Timestamp
                })
                .ToListAsync();

            return Ok(messages);
        }
    }
}
