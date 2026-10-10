import { create } from "zustand";
import { getDb } from "@/lib/db";

interface NotifState {
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  setUnread: (n: number) => void;
}

export const useNotifications = create<NotifState>((set) => ({
  unread: 0,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const db = await getDb();
      const [row] = await db.select<any[]>(
        "SELECT COUNT(*) as c FROM notifications WHERE read = 0"
      );
      set({ unread: row?.c || 0 });
    } finally {
      set({ loading: false });
    }
  },

  setUnread: (n) => set({ unread: n }),
}));
