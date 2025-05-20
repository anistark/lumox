export type MessageId = string;
export type UserId = string;
export type Timestamp = number;
export type EncryptedData = string;
export type MessageMetadata = Record<string, unknown>;

export interface Message {
  id: MessageId;
  senderId: UserId;
  receiverId: UserId;
  content: string;
  timestamp: Timestamp;
  metadata?: MessageMetadata;
}

export interface EncryptedMessage {
  id: MessageId;
  senderId: UserId;
  receiverId: UserId;
  encryptedContent: EncryptedData;
  timestamp: Timestamp;
  metadata?: MessageMetadata;
}
