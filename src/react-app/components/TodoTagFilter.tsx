import { useState } from "react";
import { Plus, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import type { TodoTagRow } from "@/lib/todo-types";

const TAG_COLORS = [
	"#6366f1",
	"#ec4899",
	"#f59e0b",
	"#10b981",
	"#3b82f6",
	"#8b5cf6",
	"#ef4444",
	"#14b8a6",
];

interface TodoTagFilterProps {
	tags: TodoTagRow[];
	selectedTagIds: number[];
	onSelectionChange: (tagIds: number[]) => void;
	onCreateTag: (name: string, color: string) => Promise<void>;
	onDeleteTag: (id: number) => Promise<void>;
}

export function TodoTagFilter({
	tags,
	selectedTagIds,
	onSelectionChange,
	onCreateTag,
	onDeleteTag,
}: TodoTagFilterProps) {
	const [manageOpen, setManageOpen] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

	const toggleTag = (tagId: number) => {
		if (selectedTagIds.includes(tagId)) {
			onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
		} else {
			onSelectionChange([...selectedTagIds, tagId]);
		}
	};

	const handleCreateTag = async () => {
		const name = newTagName.trim();
		if (!name) return;
		await onCreateTag(name, newTagColor);
		setNewTagName("");
		setNewTagColor(TAG_COLORS[0]);
	};

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<Tag className="h-3.5 w-3.5 text-muted-foreground" />
			<button
				type="button"
				onClick={() => onSelectionChange([])}
				className={cn(
					"rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
					selectedTagIds.length === 0
						? "bg-primary text-primary-foreground"
						: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
				)}
			>
				全部
			</button>
			{tags.map((tag) => (
				<button
					key={tag.id}
					type="button"
					onClick={() => toggleTag(tag.id)}
					className={cn(
						"rounded-full px-2.5 py-1 text-xs font-medium transition-colors border",
						selectedTagIds.includes(tag.id)
							? "text-white"
							: "bg-background hover:opacity-80",
					)}
					style={{
						borderColor: tag.color,
						backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : undefined,
						color: selectedTagIds.includes(tag.id) ? "#fff" : tag.color,
					}}
				>
					{tag.name}
				</button>
			))}
			<Button
				variant="ghost"
				size="sm"
				className="h-6 px-2 text-xs text-muted-foreground"
				onClick={() => setManageOpen(true)}
				aria-label="管理标签"
			>
				<Plus className="h-3 w-3" />
				标签
			</Button>

			<Dialog open={manageOpen} onOpenChange={setManageOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>管理标签</DialogTitle>
						<DialogDescription>创建和删除标签</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div className="flex gap-2">
							<Input
								placeholder="新标签名称"
								value={newTagName}
								onChange={(e) => setNewTagName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
								className="h-8 text-sm"
							/>
							<Button
								size="sm"
								className="h-8 shrink-0"
								onClick={handleCreateTag}
								disabled={!newTagName.trim()}
							>
								添加
							</Button>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{TAG_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									onClick={() => setNewTagColor(color)}
									className={cn(
										"h-6 w-6 rounded-full transition-transform",
										newTagColor === color && "ring-2 ring-offset-2 ring-primary scale-110",
									)}
									style={{ backgroundColor: color }}
									aria-label={`选择颜色 ${color}`}
								/>
							))}
						</div>
						<div className="max-h-48 space-y-1 overflow-y-auto">
							{tags.length === 0 && (
								<p className="py-4 text-center text-sm text-muted-foreground">
									暂无标签
								</p>
							)}
							{tags.map((tag) => (
								<div
									key={tag.id}
									className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
								>
									<div className="flex items-center gap-2">
										<span
											className="h-3 w-3 rounded-full"
											style={{ backgroundColor: tag.color }}
										/>
										<span className="text-sm">{tag.name}</span>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-destructive hover:text-destructive"
										onClick={() => onDeleteTag(tag.id)}
										aria-label={`删除标签 ${tag.name}`}
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
							))}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
