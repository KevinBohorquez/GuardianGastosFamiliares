export type Category =
  | "Alimentación"
  | "Transporte"
  | "Entretenimiento"
  | "Salud"
  | "Vivienda"
  | "Otros";

export const CATEGORIES: Category[] = [
  "Alimentación",
  "Transporte",
  "Entretenimiento",
  "Salud",
  "Vivienda",
  "Otros",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  "Alimentación": "hsl(155 75% 50%)",
  "Transporte": "hsl(195 95% 55%)",
  "Entretenimiento": "hsl(330 85% 65%)",
  "Salud": "hsl(0 85% 62%)",
  "Vivienda": "hsl(35 95% 58%)",
  "Otros": "hsl(270 85% 60%)",
};

export interface Profile {
  id: string;
  name: string;
  monthlyIncome: number;
  expenseRatioThreshold: number;
  color: string;
}

export interface Family {
  id: string;
  leader_id: string;
  family_name: string;
  created_at: string;
  role: "leader" | "member";
  membershipId?: string;
}

export interface FamilyMember {
  id: string;
  userId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  name?: string;
  color?: string;
  monthlyIncome?: number;
}

export interface Expense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  date: string; // ISO
  category: Category;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "expense_alert" | "family_invite";
  message: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(n || 0);

export const AVATAR_COLORS = [
  "hsl(270 85% 60%)",
  "hsl(330 85% 65%)",
  "hsl(195 95% 55%)",
  "hsl(35 95% 58%)",
  "hsl(155 75% 50%)",
  "hsl(220 90% 60%)",
  "hsl(0 85% 62%)",
  "hsl(285 80% 60%)",
];
