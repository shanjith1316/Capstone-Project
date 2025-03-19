using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FullStackApp.Server.Data;
using FullStackApp.Server.Models;

namespace FullStackApp.Server.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private static readonly ConcurrentDictionary<string, string> OnlineUsers = new();
        private static readonly ConcurrentDictionary<int, string> UserCache = new();
        private readonly ApplicationDbContext _context;

        public ChatHub(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task SendMessage(string receiverId, string message)
        {
            var senderId = GetUserId();
            if (string.IsNullOrEmpty(senderId) || string.IsNullOrEmpty(receiverId) || string.IsNullOrEmpty(message))
            {
                Console.WriteLine("❌ Invalid sender, receiver, or message.");
                await Clients.Caller.SendAsync("Error", "Invalid sender, receiver, or message.");
                return;
            }

            if (!int.TryParse(senderId, out int sender) || !int.TryParse(receiverId, out int receiver))
            {
                Console.WriteLine("❌ Invalid sender or receiver ID format.");
                await Clients.Caller.SendAsync("Error", "Invalid sender or receiver ID format.");
                return;
            }

            try
            {
                var newMessage = new Message
                {
                    SenderId = sender,
                    ReceiverId = receiver,
                    Content = message,
                    Timestamp = DateTime.UtcNow
                };

                _context.Messages.Add(newMessage);
                await _context.SaveChangesAsync();

                var senderUsername = await GetUsernameAsync(sender);
                var receiverUsername = await GetUsernameAsync(receiver);

                var messageDto = new
                {
                    SenderId = sender,
                    SenderUsername = senderUsername ?? "Unknown",
                    ReceiverId = receiver,
                    ReceiverUsername = receiverUsername ?? "Unknown",
                    Content = message,
                    Timestamp = newMessage.Timestamp
                };

                Console.WriteLine($"📤 Sending to receiver {receiverId} (ConnectionId: {OnlineUsers.GetValueOrDefault(receiverId)}): {message}");
                await Clients.User(receiverId).SendAsync("ReceiveMessage", messageDto);
                Console.WriteLine($"📤 Sending to sender {senderId} (ConnectionId: {OnlineUsers.GetValueOrDefault(senderId)}): {message}");
                await Clients.User(senderId).SendAsync("ReceiveMessage", messageDto);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to send message: {ex.Message}");
                await Clients.Caller.SendAsync("Error", $"Failed to send message: {ex.Message}");
            }
        }

        public override async Task OnConnectedAsync()
        {
            string userId = GetUserId();
            if (!string.IsNullOrEmpty(userId))
            {
                OnlineUsers[userId] = Context.ConnectionId;
                Console.WriteLine($"✅ User {userId} connected with ConnectionId {Context.ConnectionId}");
                await Clients.All.SendAsync("UserOnline", userId);
                await Clients.Caller.SendAsync("OnlineUsers", OnlineUsers.Keys.ToList());
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            string userId = GetUserId();
            if (!string.IsNullOrEmpty(userId))
            {
                OnlineUsers.TryRemove(userId, out _);
                Console.WriteLine($"👋 User {userId} disconnected");
                await Clients.All.SendAsync("UserOffline", userId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task GetOnlineUsers()
        {
            Console.WriteLine("📋 Sending online users list");
            await Clients.Caller.SendAsync("OnlineUsers", OnlineUsers.Keys.ToList());
        }

        private async Task<string> GetUsernameAsync(int userId)
        {
            if (UserCache.TryGetValue(userId, out string cachedUsername))
                return cachedUsername;

            var username = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => u.Username)
                .FirstOrDefaultAsync();

            if (username != null)
                UserCache[userId] = username;

            return username;
        }

        private string GetUserId()
        {
            var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
            var userId = userIdClaim?.Value ?? string.Empty;
            Console.WriteLine($"🔍 Retrieved UserId: {userId}");
            return userId;
        }
    }
}