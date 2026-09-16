import { supabase } from "../lib/supabase";

export type ChatRole =
  | "student"
  | "alumni"
  | "staff"
  | "business"
  | "admin";

export type MessageType =
  | "text"
  | "voice"
  | "image"
  | "file";

export type Conversation = {
  conversation_id: string;

  user_id: string;

  full_name: string | null;
  username: string | null;
  avatar_url: string | null;

  role: ChatRole;

  online: boolean;

  last_message: string | null;

  last_message_time: string | null;

  unread_count: number;

  is_mentor: boolean;

  blocked: boolean;

  archived: boolean;
};

export type Message = {
  id: string;

  conversation_id: string;
  sender_id: string;

  body: string;

  type: MessageType;

  media_path: string | null;
  voice_duration: number | null;

  created_at: string;
  read_at: string | null;

  edited_at: string | null;
  deleted_at: string | null;
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


/* =========================================================
   CURRENT USER
========================================================= */

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

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


/* =========================================================
   CONVERSATIONS
========================================================= */

export async function loadConversations():
Promise<Conversation[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_conversations"
  );

  if (error) {
    throw error;
  }

  return (
    data || []
  ).map((conversation: any) => ({
    conversation_id:
      conversation.conversation_id,

    user_id:
      conversation.user_id,

    full_name:
      conversation.full_name ?? null,

    username:
      conversation.username ?? null,

    avatar_url:
      conversation.avatar_url ?? null,

    role:
      conversation.role,

    online:
      Boolean(
        conversation.online
      ),

    last_message:
      conversation.last_message ?? null,

    last_message_time:
      conversation.last_message_time ??
      null,

    unread_count:
      Number(
        conversation.unread_count
      ) || 0,

    is_mentor:
      Boolean(
        conversation.is_mentor
      ),

    blocked:
      Boolean(
        conversation.blocked
      ),

    archived:
      Boolean(
        conversation.archived
      ),
  }));
}


/* =========================================================
   MESSAGES
========================================================= */

export async function loadMessages(
  conversationId: string
): Promise<Message[]> {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("messages")
    .select(`
      id,
      conversation_id,
      sender_id,
      body,
      type,
      media_path,
      voice_duration,
      created_at,
      read_at,
      edited_at,
      deleted_at
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

  return (
    data || []
  ).map((message: any) => ({
    id:
      message.id,

    conversation_id:
      message.conversation_id,

    sender_id:
      message.sender_id,

    body:
      message.body ?? "",

    type:
      (message.type ||
        "text") as MessageType,

    media_path:
      message.media_path ?? null,

    voice_duration:
      message.voice_duration !== null &&
      message.voice_duration !== undefined
        ? Number(
            message.voice_duration
          )
        : null,

    created_at:
      message.created_at,

    read_at:
      message.read_at ?? null,

    edited_at:
      message.edited_at ?? null,

    deleted_at:
      message.deleted_at ?? null,
  }));
}


/* =========================================================
   SEND TEXT MESSAGE
========================================================= */

export async function sendMessage(
  conversationId: string,
  body: string
) {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  const user =
    await getCurrentUser();

  const cleaned =
    body.trim();

  if (!cleaned) {
    return;
  }

  if (cleaned.length > 3000) {
    throw new Error(
      "Message is too long."
    );
  }

  const {
    error,
  } = await supabase
    .from("messages")
    .insert({
      conversation_id:
        conversationId,

      sender_id:
        user.id,

      body:
        cleaned,

      type:
        "text",

      media_path:
        null,

      voice_duration:
        null,
    });

  if (error) {
    throw error;
  }
}


/* =========================================================
   SEND VOICE MESSAGE
========================================================= */

export async function sendVoiceMessage(
  conversationId: string,
  mediaPath: string,
  durationSeconds: number
) {
  if (!conversationId) {
    throw new Error(
      "Conversation ID is required."
    );
  }

  if (!mediaPath) {
    throw new Error(
      "Voice file path is required."
    );
  }

  const user =
    await getCurrentUser();

  const duration =
    Math.max(
      1,
      Math.floor(
        durationSeconds
      )
    );

  const {
    error,
  } = await supabase
    .from("messages")
    .insert({
      conversation_id:
        conversationId,

      sender_id:
        user.id,

      body: "",

      type:
        "voice",

      media_path:
        mediaPath,

      voice_duration:
        duration,
    });

  if (error) {
    throw error;
  }
}


/* =========================================================
   UPDATE CONVERSATION TIMESTAMP
========================================================= */

export async function touchConversation(
  conversationId: string
) {
  if (!conversationId) {
    return;
  }

  const {
    error,
  } = await supabase
    .from("conversations")
    .update({
      updated_at:
        new Date()
          .toISOString(),
    })
    .eq(
      "id",
      conversationId
    );

  if (error) {
    console.log(
      "Conversation timestamp error:",
      error
    );
  }
}


/* =========================================================
   MARK CONVERSATION READ
========================================================= */

export async function markConversationRead(
  conversationId: string
) {
  if (!conversationId) {
    return;
  }

  const {
    error,
  } = await supabase.rpc(
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


/* =========================================================
   MESSAGE REQUESTS
========================================================= */

export async function loadRequests():
Promise<MessageRequest[]> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_my_message_requests"
  );

  if (error) {
    throw error;
  }

  return (
    data || []
  ).map((request: any) => ({
    request_id:
      request.request_id,

    sender_id:
      request.sender_id,

    full_name:
      request.full_name ||
      "Richfield Member",

    username:
      request.username ?? null,

    avatar_url:
      request.avatar_url ?? null,

    role:
      request.role,

    created_at:
      request.created_at,
  }));
}


/* =========================================================
   ACCEPT REQUEST
========================================================= */

export async function acceptRequest(
  requestId: string
) {
  if (!requestId) {
    throw new Error(
      "Request ID is required."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
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

  return data as string | null;
}


/* =========================================================
   REJECT REQUEST
========================================================= */

export async function rejectRequest(
  requestId: string
) {
  if (!requestId) {
    throw new Error(
      "Request ID is required."
    );
  }

  const {
    error,
  } = await supabase.rpc(
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


/* =========================================================
   SEND MESSAGE REQUEST
========================================================= */

export async function sendMessageRequest(
  recipientId: string
) {
  const user =
    await getCurrentUser();

  if (!recipientId) {
    throw new Error(
      "Recipient is required."
    );
  }

  if (
    recipientId === user.id
  ) {
    throw new Error(
      "You cannot send a request to yourself."
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "message_requests"
    )
    .insert({
      sender_id:
        user.id,

      recipient_id:
        recipientId,

      status:
        "pending",
    });

  if (error) {
    if (
      error.code ===
      "23505"
    ) {
      throw new Error(
        "A connection request already exists."
      );
    }

    throw error;
  }
}


/* =========================================================
   BLOCK USER
========================================================= */

export async function blockUser(
  userId: string
) {
  const user =
    await getCurrentUser();

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  if (
    userId === user.id
  ) {
    throw new Error(
      "You cannot block yourself."
    );
  }

  const {
    error,
  } = await supabase
    .from("blocked_users")
    .insert({
      blocker_id:
        user.id,

      blocked_id:
        userId,
    });

  if (error) {
    if (
      error.code ===
      "23505"
    ) {
      return;
    }

    throw error;
  }
}


/* =========================================================
   UNBLOCK USER
========================================================= */

export async function unblockUser(
  userId: string
) {
  const user =
    await getCurrentUser();

  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const {
    error,
  } = await supabase
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


/* =========================================================
   LABEL ALUMNI AS MENTOR
========================================================= */

export async function labelMentor(
  mentorId: string
) {
  const user =
    await getCurrentUser();

  if (!mentorId) {
    throw new Error(
      "Mentor ID is required."
    );
  }

  if (
    mentorId === user.id
  ) {
    throw new Error(
      "You cannot label yourself as a mentor."
    );
  }

  const {
    error,
  } = await supabase
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
    if (
      error.code ===
      "23505"
    ) {
      return;
    }

    throw error;
  }
}


/* =========================================================
   REMOVE MENTOR LABEL
========================================================= */

export async function removeMentorLabel(
  mentorId: string
) {
  const user =
    await getCurrentUser();

  if (!mentorId) {
    throw new Error(
      "Mentor ID is required."
    );
  }

  const {
    error,
  } = await supabase
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

/* =========================================================
   ARCHIVE CONVERSATION
========================================================= */

export async function archiveConversation(
  conversationId: string
) {
  const {
    error,
  } = await supabase.rpc(
    "archive_conversation",
    {
      p_conversation_id:
        conversationId,
    }
  );

  if (error) {
    throw error;
  }
}


/* =========================================================
   UNARCHIVE CONVERSATION
========================================================= */

export async function unarchiveConversation(
  conversationId: string
) {
  const {
    error,
  } = await supabase.rpc(
    "unarchive_conversation",
    {
      p_conversation_id:
        conversationId,
    }
  );

  if (error) {
    throw error;
  }
}


/* =========================================================
   HIDE FROM MY CHATS
========================================================= */

export async function hideConversation(
  conversationId: string
) {
  const {
    error,
  } = await supabase.rpc(
    "hide_conversation",
    {
      p_conversation_id:
        conversationId,
    }
  );

  if (error) {
    throw error;
  }
}


/* =========================================================
   EDIT MESSAGE
========================================================= */

export async function editMessage(
  messageId: string,
  body: string
) {
  const cleaned =
    body.trim();

  if (!cleaned) {
    throw new Error(
      "Message cannot be empty."
    );
  }

  if (cleaned.length > 3000) {
    throw new Error(
      "Message is too long."
    );
  }

  const {
    error,
  } = await supabase.rpc(
    "edit_message",
    {
      p_message_id:
        messageId,

      p_body:
        cleaned,
    }
  );

  if (error) {
    throw error;
  }
}


/* =========================================================
   DELETE MESSAGE
========================================================= */

export async function deleteMessage(
  messageId: string
) {
  const {
    error,
  } = await supabase.rpc(
    "delete_message",
    {
      p_message_id:
        messageId,
    }
  );

  if (error) {
    throw error;
  }
}