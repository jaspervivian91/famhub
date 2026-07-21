// Family Hub shared types

export interface Account {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  account_id: string;
  expires_at: string;
  created_at: string;
}

export interface AccountPublic {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  created_at: string;
  plan: "free" | "premium";
  invite_code: string;
}

export interface FamilyMember {
  id: string;
  group_id: string;
  display_name: string;
  relationship: string;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
  account_id?: string | null;
  preferences?: MemberPreferences;
}

export interface MemberPreferences {
  id: string;
  member_id: string;
  ui_mode: "standard" | "grandparent";
  notifications_enabled: boolean;
  digest_frequency: "daily" | "weekly" | "monthly";
}

export interface Interaction {
  id: string;
  from_member_id: string;
  to_member_id: string | null;
  group_id: string;
  interaction_type:
    | "nudge_sent"
    | "nudge_acknowledged"
    | "message_sent"
    | "reaction"
    | "call_started"
    | "digest_opened";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Nudge {
  id: string;
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  nudge_type: "dormancy" | "cooling" | "celebration" | "conversation_starter";
  message_text: string;
  status: "pending" | "acknowledged" | "ignored";
  created_at: string;
  acknowledged_at: string | null;
}

export type ScoreCategory = "dormant" | "cooling" | "steady" | "thriving";

export interface PairScoreFactors {
  recency: number;
  frequency: number;
  initiationBalance: number;
  trend: number;
}

export interface PairScore {
  score: number;
  category: ScoreCategory;
  factors: PairScoreFactors;
  fromMemberId: string;
  toMemberId: string;
}

export interface ConversationStarter {
  id: string;
  text: string;
  category: "memory" | "photo" | "question" | "activity";
}

export interface NudgeWithScore extends Nudge {
  score?: PairScore;
}

export interface Digest {
  id: string;
  group_id: string;
  member_id: string;
  content: Record<string, unknown>;
  sent_at: string | null;
  opened_at: string | null;
}

export interface GroupWithMembers extends FamilyGroup {
  members: FamilyMember[];
}

export interface RelationshipSnapshot {
  pair: [string, string];
  names: [string, string];
  lastInteraction: string | null;
  daysSince: number | null;
}
