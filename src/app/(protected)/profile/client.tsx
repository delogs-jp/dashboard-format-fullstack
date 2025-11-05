// src/app/(protected)/profile/client.tsx
"use client";

import { useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProfileForm from "@/components/profile/profile-form";
import type { ProfileUpdateValues } from "@/lib/users/schema";
import { useAuth } from "@/lib/auth/context";
import { updateProfileAction } from "@/app/_actions/profile/avatar";
import { refreshAuthSnapshotAction } from "@/app/_actions/auth/refresh";
import { deleteOwnAvatarAction } from "@/app/_actions/profile/avatar";
import { EmailChangeStatusBanner } from "@/components/profile/email-change-status";
import {
  getMyEmailChangeStatus,
  type MyEmailChangeSummary,
} from "@/app/_actions/profile/email-status";
import type { MyProfileDetail } from "@/app/_actions/profile/get-profile-detail"; // ★ 追加

type Props = { initial: MyProfileDetail }; // ★ 追加

export default function ProfileClient({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { ready, setUser } = useAuth();
  const [summary, setSummary] = useState<MyEmailChangeSummary>({
    exists: false,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getMyEmailChangeStatus();
      if (mounted) setSummary(s);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;

  const applyFreshSnapshot = async (msg?: string) => {
    const snap = await refreshAuthSnapshotAction();
    if (snap.ok) {
      const ts = Date.now();
      const updated = {
        ...snap.user,
        avatarUrl:
          snap.user.avatarUrl != null
            ? `${snap.user.avatarUrl}?ts=${ts}`
            : null,
      };
      setUser(updated);
    }
    if (msg) {
      toast.success(msg, { duration: 3000 });
    }
  };

  const handleSubmit = (values: ProfileUpdateValues) => {
    if (pending) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", values.name);
        if (values.phone) fd.set("phone", values.phone);
        if (values.avatarFile) fd.set("avatarFile", values.avatarFile);

        const res = await updateProfileAction(fd);
        if (!res.ok) {
          toast.error(res.message ?? "プロフィールの更新に失敗しました");
          return;
        }
        await applyFreshSnapshot(
          values.avatarFile
            ? "プロフィールを更新しました（画像含む）"
            : "プロフィールを更新しました",
        );
      } catch (e) {
        console.error(e);
        toast.error(
          "予期せぬエラーが発生しました。時間をおいて再試行してください。",
        );
      }
    });
  };

  // ★ 追加：登録済みアバターの削除（DB反映）
  const handleDeleteAvatar = () => {
    if (pending) return;
    startTransition(async () => {
      try {
        const res = await deleteOwnAvatarAction();
        if (!res.ok) {
          toast.error(res.message ?? "アバターの削除に失敗しました");
          return;
        }
        await applyFreshSnapshot("アバターを削除しました");
      } catch (e) {
        console.error(e);
        toast.error(
          "予期せぬエラーが発生しました。時間をおいて再試行してください。",
        );
      }
    });
  };

  return (
    <>
      <EmailChangeStatusBanner summary={summary} />
      <ProfileForm
        initial={{
          name: initial.name,
          email: initial.email,
          phone: initial.phone ?? undefined,
          currentAvatarUrl: initial.currentAvatarUrl ?? undefined,
          effectiveRoleName: initial.effectiveRoleName,
          effectiveBadgeColor: initial.effectiveBadgeColor,
        }}
        onSubmit={handleSubmit}
        onDelete={handleDeleteAvatar}
        onCancel={() => history.back()}
        onNavigateEmail={() => router.push("/profile/email")}
        onNavigatePassword={() => router.push("/profile/password")}
      />
    </>
  );
}
