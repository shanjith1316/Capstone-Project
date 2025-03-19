using System;

namespace FullStackApp.Server.Models
{
    public class Message
    {
        public int Id { get; set; }  // Unique ID
        public int SenderId { get; set; }  // User who sent the message
        public int ReceiverId { get; set; }  // User who receives the message
        public string Content { get; set; }  // Message text
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;  // When message was sent
    }
}
