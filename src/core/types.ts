export type MessageId = string;
export type UserId = string;
export type Timestamp = number;
export type EncryptedData = string;

export interface Message {
  id: MessageId;
  senderId: UserId;
  receiverId: UserId;
  content: string;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}

export interface EncryptedMessage {
  id: MessageId;
  senderId: UserId;
  receiverId: UserId;
  encryptedContent: EncryptedData;
  timestamp: Timestamp;
  metadata?: Record<string, any>;
}
