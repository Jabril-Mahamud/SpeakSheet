"use client";
'use client';
import React, { useState, useEffect, ReactNode } from 'react';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TableBaseProps {
  children: ReactNode;
  className?: string;
}

interface TableRowProps extends TableBaseProps {
  'data-state'?: string | boolean;
}

interface TableCellProps extends TableBaseProps {
  colSpan?: number;
  style?: React.CSSProperties;
}

interface PollyUsageData {
  user_id: string;
  characters_synthesized: number;
  voice_id: string;
  synthesis_date: string;
  user: {
    email: string;
    id: string;
  } | null;
}

interface UsageStats {
  totalCharacters: number;
  totalUsers: number;
  averagePerUser: number;
}

// Table component interfaces
interface TableBaseProps {
  children: ReactNode;
  className?: string;
}
interface TableCellProps extends TableBaseProps {
  colSpan?: number;
  style?: React.CSSProperties;
}

// Table components
const Table: React.FC<TableBaseProps> = ({ children, className = '' }) => (
  <div className={`w-full border rounded-md ${className}`}>{children}</div>
);

const TableHeader: React.FC<TableBaseProps> = ({ children }) => (
  <div className="border-b">{children}</div>
);

const TableBody: React.FC<TableBaseProps> = ({ children }) => (
  <div>{children}</div>
);

const TableRow: React.FC<TableRowProps> = ({ children, className = '', ...props }) => (
  <div 
    className={`flex border-b last:border-b-0 hover:bg-gray-50 ${className}`} 
    {...props}
  >
    {children}
  </div>
);

const TableHead: React.FC<TableCellProps> = ({ children, className = '', style }) => (
  <div 
    className={`flex-1 p-3 font-medium text-sm ${className}`}
    style={style}
  >
    {children}
  </div>
);

const TableCell: React.FC<TableCellProps> = ({ children, className = '', colSpan, style }) => (
  <div 
    className={`flex-1 p-3 truncate ${className}`}
    style={{
      ...style,
      gridColumn: colSpan ? `span ${colSpan}` : undefined
    }}
  >
    <div className="truncate">
      {children}
    </div>
  </div>
);


const UsageStatsCard = ({ stats }: { stats: UsageStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Total Characters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {stats.totalCharacters.toLocaleString()}
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {stats.totalUsers.toLocaleString()}
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Avg. Per User</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {stats.averagePerUser.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
        </div>
      </CardContent>
    </Card>
  </div>
);
export default function PollyUsageDataGrid() {
  const [data, setData] = useState<PollyUsageData[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "synthesis_date", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UsageStats>({
    totalCharacters: 0,
    totalUsers: 0,
    averagePerUser: 0,
  });

  useEffect(() => {
    const fetchPollyUsage = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/usage/polly");

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication required. Please log in.");
          }
          if (response.status === 403) {
            throw new Error("You do not have permission to view this data.");
          }
          throw new Error("Failed to fetch Polly usage data");
        }

        const fetchedData: PollyUsageData[] = await response.json();

        // Calculate stats
        const uniqueUsers = new Set(fetchedData.map((item) => item.user_id));
        const totalChars = fetchedData.reduce(
          (sum, item) => sum + item.characters_synthesized,
          0
        );

        setStats({
          totalCharacters: totalChars,
          totalUsers: uniqueUsers.size,
          averagePerUser: totalChars / uniqueUsers.size,
        });

        setData(fetchedData);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPollyUsage();
  }, []);

  const columns: ColumnDef<PollyUsageData>[] = [
    {
      accessorKey: "user.email",
      header: "User Email",
      cell: ({ row }) => {
        const user = row.original.user;
        return user?.email || "Unknown User";
      },
    },
    {
      accessorKey: "user_id",
      header: "User ID",
      cell: ({ row }) => (
        <div
          className="font-mono text-xs truncate"
          title={row.getValue("user_id")}
        >
          {row.getValue("user_id")}
        </div>
      ),
    },
    {
      accessorKey: "synthesis_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          Date
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("synthesis_date"));
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      accessorKey: "voice_id",
      header: "Voice ID",
    },
    {
      accessorKey: "characters_synthesized",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          Characters
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("characters_synthesized"));
        return amount.toLocaleString();
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  const handleExport = () => {
    const csvContent = [
      // Header
      ["Email", "User ID", "Date", "Voice ID", "Characters"],
      // Data
      ...data.map((row) => [
        row.user?.email || "Unknown",
        row.user_id,
        new Date(row.synthesis_date).toLocaleString(),
        row.voice_id,
        row.characters_synthesized,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `polly-usage-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Polly Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Loading usage data...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Polly Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Polly Usage Statistics</CardTitle>
        <CardDescription>
          View and analyze text-to-speech usage across all users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UsageStatsCard stats={stats} />

        <div className="flex items-center justify-between py-4">
          <Input
            placeholder="Search all fields..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
