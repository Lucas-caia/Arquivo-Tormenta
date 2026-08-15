export type SubmissionStatus =
  | "pending"
  | "imported"
  | "discarded"
  | "blocked"
  | "expired";

export type SubmissionSecurity = {
  status: "not-scanned" | "clean" | "infected";
  scannedAt?: string;
  signature?: string;
};

export type SubmissionDecision = {
  action: "imported" | "discarded" | "blocked" | "expired";
  decidedAt: string;
  decidedBy?: {
    id: string;
    name: string;
  };
  result?: "nova" | "revisao" | "sem-alteracoes";
};
export type DiscordSubmission = {
  id: string;
  protocol: string;
  status: SubmissionStatus;
  originalFilename: string;
  contentType: string;
  size: number;
  sha256: string;
  submittedAt: string;
  expiresAt: string;
  submittedBy: {
    id: string;
    name: string;
  };
  guildId: string;
  submissionChannelId: string;
  reviewChannelId: string;
  reviewMessageId?: string;
  sourceMessageId?: string;
  sourceAttachmentId?: string;
  security: SubmissionSecurity;
  decision?: SubmissionDecision;
};
