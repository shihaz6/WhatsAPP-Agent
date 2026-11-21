import type { Lang } from "./theme";

/**
 * On-screen copy. Each caption is a list of lines; *stars* mark the highlighted (orange) words.
 * English captions are at most 7 words each. The brief's 8-word line
 * "Customers don't wait. They message the next shop." is split across the Shot 3 -> Shot 4 cut
 * so each half stays within the limit.
 */
export type Copy = {
  c1: string[];
  c2: string[];
  c3a: string[];
  c3b: string[];
  c4: string[];
  c5: string[];
  c6: string[];
  endHeadline: string[];
  endButton: string;
  endButtonSub: string;
};

export const COPY: Record<Lang, Copy> = {
  en: {
    c1: ["9:30 PM. Your dinner", "vs your *customers* 📱"],
    c2: ["He replies to *one.*", "*Three more* arrive."],
    c3a: ["Customers *don't wait.*"],
    c3b: ["They message", "the *next shop.*"],
    c4: ["Now, *Catalyst* replies."],
    c5: ["Replies in *3 seconds.*", "Takes the order."],
    c6: ["Orders taken", "*while he slept.*"],
    endHeadline: ["Stop losing customers", "while you eat."],
    endButton: "Comment ‘BOT’ 👇",
    endButtonSub: "Free 7-day trial",
  },
  si: {
    c1: ["රෑ 9:30යි. කෑම ද?", "*පාරිභෝගිකයෝ* ද? 📱"],
    c2: ["එක්කෙනෙක්ට *උත්තර* දෙද්දී,", "*තව තුන්දෙනෙක්* එනවා."],
    c3a: ["පාරිභෝගිකයෝ", "*බලන් ඉන්නේ නෑ.*"],
    c3b: ["එයාලා *ඊළඟ කඩේට*", "මැසේජ් කරනවා."],
    c4: ["දැන් *Catalyst*", "උත්තර දෙනවා."],
    c5: ["*තත්පර 3න්* උත්තර.", "ඕඩර් එකත් ගන්නවා."],
    c6: ["එයා නිදාගෙන ඉද්දී", "*ඕඩර් ගත්තා.*"],
    endHeadline: ["කන වෙලාවේ", "පාරිභෝගිකයෝ", "නැති කරගන්න එපා."],
    endButton: "‘BOT’ කියලා කමෙන්ට් කරන්න 👇",
    endButtonSub: "දින 7ක් නොමිලේ",
  },
};
