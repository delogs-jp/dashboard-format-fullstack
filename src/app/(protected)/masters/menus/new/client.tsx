// src/app/(protected)/masters/menus/new/client.tsx
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import MenuForm from "@/components/menus/menu-form";
import { addMenu } from "@/lib/sidebar/menu.mock";
import type { MenuRecord, MenuCreateValues } from "@/lib/sidebar/menu.schema";
import type { ParentOption, IconOption } from "@/components/menus/menu-form";

type Props = {
  parentOptions: ParentOption[];
  iconOptions: IconOption[];
};

export default function NewMenuClient({ parentOptions, iconOptions }: Props) {
  const router = useRouter();

  return (
    <MenuForm
      mode="create"
      parentOptions={parentOptions}
      iconOptions={iconOptions}
      onSubmit={(values: MenuCreateValues) => {
        // モックストアへ保存（order は addMenu 側で末尾採番）
        const created: MenuRecord = addMenu({
          parentId: values.parentId, // null or displayId
          title: values.title,
          isSection: values.isSection,
          href: values.isSection ? undefined : values.href,
          match: values.isSection ? "prefix" : values.match,
          pattern: values.isSection ? undefined : values.pattern,
          iconName: values.iconName || undefined,
          minPriority: values.minPriority, // number | undefined
          isActive: values.isActive,
          hidden: values.hidden,
          lockHiddenOverride: false,
        });

        toast.success("メニューを作成しました", {
          description: `${created.displayId} / ${created.title}`,
        });
        router.push("/masters/menus");
      }}
      onCancel={() => history.back()}
    />
  );
}
