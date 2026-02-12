export type Role = "system" | "developer" | "user" | "assistant" | "tool";
export type Msg = { role: Role; content: any; name?: string };
