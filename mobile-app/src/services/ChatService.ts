import { supabase } from "../lib/supabase";

export type ChatRole =
  | "student"
  | "alumni"
  | "business"
  | "admin";

export type Conversation = {
  conversation_id: string;
  user_id: string;

  full_name: string;
  username: string | null;
  avatar_url: string | null;

  role: ChatRole;

  online: boolean;

  last_message: string | null;
  last_message_time: string | null;

  unread_count: number;

  is_mentor: boolean;
  blocked: boolean;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type MessageRequest = {
  request_id: string;
  sender_id: string;

  full_name: string;
  username: string | null;
  avatar_url: string | null;

  role:
    | "student"
    | "alumni";

  created_at: string;
};


export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error(
      "You are not signed in."
    );
  }

  return user;
}


export async function loadConversations():
Promise<Conversation[]> {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_my_conversations"
    );

  if (error) {
    throw error;
  }

  return (
    data || []
  ).map((conversation: any) => ({
    ...conversation,

    unread_count:
      Number(
        conversation.unread_count
      ) || 0,
  }));
}


export async function loadMessages(
  conversationId: string
): Promise<Message[]> {

  const {
    data,
    error,
  } =
    await supabase
      .from("messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        body,
        created_at,
        read_at
      `)
      .eq(
        "conversation_id",
        conversationId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (error) {
    throw error;
  }

  return data || [];
}


export async function sendMessage(
  conversationId: string,
  body: string
) {
  const user =
    await getCurrentUser();

  const cleaned =
    body.trim();

  if (!cleaned) {
    return;
  }

  const {
    error,
  } =
    await supabase
      .from("messages")
      .insert({
        conversation_id:
          conversationId,

        sender_id:
          user.id,

        body:
          cleaned,
      });

  if (error) {
    throw error;
  }
}


export async function markConversationRead(
  conversationId: string
) {
  const {
    error,
  } =
    await supabase.rpc(
      "mark_conversation_read",
      {
        conversation_uuid:
          conversationId,
      }
    );

  if (error) {
    console.log(
      "Mark read error:",
      error
    );
  }
}


export async function loadRequests():
Promise<MessageRequest[]> {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_my_message_requests"
    );

  if (error) {
    throw error;
  }

  return data || [];
}


export async function acceptRequest(
  requestId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "respond_to_message_request",
      {
        request_uuid:
          requestId,

        response_status:
          "accepted",
      }
    );

  if (error) {
    throw error;
  }

  return data as string;
}


export async function rejectRequest(
  requestId: string
) {
  const {
    error,
  } =
    await supabase.rpc(
      "respond_to_message_request",
      {
        request_uuid:
          requestId,

        response_status:
          "rejected",
      }
    );

  if (error) {
    throw error;
  }
}


export async function sendMessageRequest(
  recipientId: string
) {
  const user =
    await getCurrentUser();

  const {
    error,
  } =
    await supabase
      .from(
        "message_requests"
      )
      .insert({
        sender_id:
          user.id,

        recipient_id:
          recipientId,
      });

  if (error) {
    throw error;
  }
}


export async function blockUser(
  userId: string
) {
  const user =
    await getCurrentUser();

  const {
    error,
  } =
    await supabase
      .from("blocked_users")
      .insert({
        blocker_id:
          user.id,

        blocked_id:
          userId,
      });

  if (error) {
    throw error;
  }
}


export async function unblockUser(
  userId: string
) {
  const user =
    await getCurrentUser();

  const {
    error,
  } =
    await supabase
      .from("blocked_users")
      .delete()
      .eq(
        "blocker_id",
        user.id
      )
      .eq(
        "blocked_id",
        userId
      );

  if (error) {
    throw error;
  }
}


export async function labelMentor(
  mentorId: string
) {
  const user =
    await getCurrentUser();

  const {
    error,
  } =
    await supabase
      .from(
        "mentor_relationships"
      )
      .insert({
        student_id:
          user.id,

        mentor_id:
          mentorId,
      });

  if (error) {
    throw error;
  }
}


export async function removeMentorLabel(
  mentorId: string
) {
  const user =
    await getCurrentUser();

  const {
    error,
  } =
    await supabase
      .from(
        "mentor_relationships"
      )
      .delete()
      .eq(
        "student_id",
        user.id
      )
      .eq(
        "mentor_id",
        mentorId
      );

  if (error) {
    throw error;
  }
}