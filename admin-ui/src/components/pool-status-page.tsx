import { AlertTriangle, Ban, CheckCircle2, Clock, Gauge, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePoolStatus, useRpm } from "@/hooks/use-credentials";
import type {
  PoolBusyEntry,
  PoolDisabledEntry,
  PoolEntryBase,
  PoolIdleEntry,
  PoolRpmFullEntry,
} from "@/types/api";

type PoolSection =
  | {
      key: "busy";
      title: string;
      tone: string;
      icon: React.ReactNode;
      rows: PoolBusyEntry[];
    }
  | {
      key: "idle";
      title: string;
      tone: string;
      icon: React.ReactNode;
      rows: PoolIdleEntry[];
    }
  | {
      key: "rpmFull";
      title: string;
      tone: string;
      icon: React.ReactNode;
      rows: PoolRpmFullEntry[];
    }
  | {
      key: "disabled";
      title: string;
      tone: string;
      icon: React.ReactNode;
      rows: PoolDisabledEntry[];
    };

export function PoolStatusPage() {
  const {
    data,
    isLoading,
    isFetching,
    refetch: refetchPoolStatus,
  } = usePoolStatus();
  const {
    data: rpm,
    isFetching: isFetchingRpm,
    refetch: refetchRpm,
  } = useRpm();

  const sections: PoolSection[] = [
    {
      key: "busy",
      title: "冷却中",
      tone: "text-sky-600 dark:text-sky-400",
      icon: <Clock className="h-4 w-4" />,
      rows: data?.busy ?? [],
    },
    {
      key: "idle",
      title: "可用",
      tone: "text-emerald-600 dark:text-emerald-400",
      icon: <CheckCircle2 className="h-4 w-4" />,
      rows: data?.idle ?? [],
    },
    {
      key: "rpmFull",
      title: "RPM满",
      tone: "text-amber-600 dark:text-amber-400",
      icon: <Gauge className="h-4 w-4" />,
      rows: data?.rpmFull ?? [],
    },
    {
      key: "disabled",
      title: "禁用",
      tone: "text-muted-foreground",
      icon: <Ban className="h-4 w-4" />,
      rows: data?.disabled ?? [],
    },
  ];

  const total = sections.reduce((sum, section) => sum + section.rows.length, 0);
  const isRefreshing = isFetching || isFetchingRpm;
  const refreshAll = () => {
    void refetchPoolStatus();
    void refetchRpm();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight leading-tight sm:text-[28px]">
            池状态
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            查看账号当前调度池：冷却中、可用、RPM满、禁用。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-primary">
              <Gauge className="h-4 w-4" />
              总 RPM
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">
              {rpm?.global ?? 0}
            </div>
          </CardContent>
        </Card>
        {sections.map((section) => (
          <Card key={section.key}>
            <CardContent className="p-3 sm:p-5">
              <div className={`flex items-center gap-1.5 text-[12px] font-medium ${section.tone}`}>
                {section.icon}
                {section.title}
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">
                {section.rows.length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            加载中...
          </CardContent>
        </Card>
      ) : total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            暂无账号池数据
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map((section) => (
            <PoolStatusSection key={section.key} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

function PoolStatusSection({ section }: { section: PoolSection }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className={`flex items-center gap-2 font-medium ${section.tone}`}>
            {section.icon}
            <span>{section.title}</span>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {section.rows.length}
          </Badge>
        </div>
        {section.rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            当前没有{section.title}账号
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">ID</th>
                  <th className="px-4 py-2 font-medium">邮箱</th>
                  <th className="px-4 py-2 font-medium">优先级</th>
                  <th className="px-4 py-2 font-medium">分组</th>
                  <th className="px-4 py-2 text-right font-medium">状态详情</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/50">
                    <td className="px-4 py-2 font-mono text-xs tabular-nums">#{row.id}</td>
                    <td className="max-w-[220px] truncate px-4 py-2">
                      {row.email || "-"}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{row.priority}</td>
                    <td className="px-4 py-2">
                      <GroupsCell groups={row.groups} />
                    </td>
                    <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
                      <PoolDetail sectionKey={section.key} row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GroupsCell({ groups }: { groups: string[] }) {
  if (!groups.length) return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <div className="flex max-w-[220px] flex-wrap gap-1">
      {groups.map((group) => (
        <Badge key={group} variant="outline" className="max-w-[120px] truncate text-[11px]">
          {group}
        </Badge>
      ))}
    </div>
  );
}

function PoolDetail({
  row,
  sectionKey,
}: {
  row: PoolEntryBase;
  sectionKey: PoolSection["key"];
}) {
  if (sectionKey === "busy") {
    const busy = row as PoolBusyEntry;
    return <span>剩余 {formatDuration(busy.remainingSecs)}</span>;
  }

  if (sectionKey === "idle") {
    const idle = row as PoolIdleEntry;
    return <span>RPM {idle.currentRpm}/{idle.rpmLimit ?? "不限"}</span>;
  }

  if (sectionKey === "rpmFull") {
    const rpmFull = row as PoolRpmFullEntry;
    return <span>RPM {rpmFull.currentRpm}/{rpmFull.rpmLimit}</span>;
  }

  const disabled = row as PoolDisabledEntry;
  return (
    <span className="inline-flex items-center justify-end gap-1">
      {disabled.reason ? null : <AlertTriangle className="h-3.5 w-3.5" />}
      {disabled.reason || "已禁用"}
    </span>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const minuteRest = minutes % 60;
  return minuteRest ? `${hours}h ${minuteRest}m` : `${hours}h`;
}
