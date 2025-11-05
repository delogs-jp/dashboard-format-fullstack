// src/types/table-meta.d.ts
import "@tanstack/table-core";
import type { ReqStatus } from "@/app/(protected)/users/email-change-requests/status-multi-select";
import type { PwReqStatus } from "@/app/(protected)/users/password-request/status-multi-select";

declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {
    onMoveUp?: (id: string, _row?: TData) => void;
    onMoveDown?: (id: string, _row?: TData) => void;
    onToggleActive?: (displayId: string, next: boolean, _row?: TData) => void;
    // ★ 追加：処理中IDセット
    movingIds?: Set<string>;
    togglingIds?: Set<string>;
    // ★ 追加：この行は「最終的にこうなるはず」という可視状態
    pendingVisible?: Map<string, boolean>;

    /** 依頼を「再発行済み」にする */
    onIssue?: (id: string, _row?: TData) => void | Promise<void>;
    /** 依頼を「拒否」にする */
    onReject?: (id: string, _row?: TData) => void | Promise<void>;
    /** メール変更申請を「承認」する */
    onApprove?: (id: string, _row?: TData) => void | Promise<void>;
    // ▼ ユーザ一覧用（必要なものだけ）
    roleOptions?: Array<{ value: string; label: string }>;
    roles?: string[];
    setRoles?: (next: string[]) => void;

    status?: "ALL" | "ACTIVE" | "INACTIVE";
    setStatus?: (next: "ALL" | "ACTIVE" | "INACTIVE") => void;

    createdRange?: import("react-day-picker").DateRange | undefined;
    setCreatedRange?: (
      r: import("react-day-picker").DateRange | undefined,
    ) => void;

    updatedRange?: import("react-day-picker").DateRange | undefined;
    setUpdatedRange?: (
      r: import("react-day-picker").DateRange | undefined,
    ) => void;

    // ▼ ロール一覧用（masters/roles）
    kindOptions?: Array<{ value: string; label: string }>;
    kinds?: string[];
    setKinds?: (next: string[]) => void;

    // ▼ “申請系”の状態（メール変更申請・パスワード再発行の両方をカバー）
    //    メール変更申請: PENDING/VERIFIED/APPROVED/REJECTED/EXPIRED
    //    パスワード再発行: PENDING/ISSUED/REJECTED
    statusOptions?: Array<{ value: ReqStatus; label: string }>;
    statuses?: ReqStatus[];
    setStatuses?: (next: ReqStatus[]) => void;

    // ▼ 新規：パスワード再発行一覧（メール変更申請と分離）
    pwStatusOptions?: Array<{ value: PwReqStatus; label: string }>;
    pwStatuses?: PwReqStatus[];
    setPwStatuses?: (next: PwReqStatus[]) => void;

    // 日付レンジ（申請日時・処理日時）
    requestedRange?: import("react-day-picker").DateRange | undefined;
    setRequestedRange?: (
      r: import("react-day-picker").DateRange | undefined,
    ) => void;

    processedRange?: import("react-day-picker").DateRange | undefined;
    setProcessedRange?: (
      r: import("react-day-picker").DateRange | undefined,
    ) => void;
  }
}

export {};
