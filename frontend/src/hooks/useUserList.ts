import { useEffect, useState, useCallback } from "react";
import { listUsers } from "@/api/user";
import { MOCK_LIST_USERS_RESPONSE } from "@/hooks/mockDataDashboard";
import { USE_MOCK, type ApiUser, type ROLES_USER, type STATUS_USERS } from "@/types/index";
import { alertService } from "@/services/alertService";

const PAGE_SIZE = 20;

export function useUserList(fixedRole: ROLES_USER) {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState<STATUS_USERS | "all">("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);

        if (USE_MOCK) {
        
            const source = MOCK_LIST_USERS_RESPONSE.data;

            const filtered = source.users.filter((u) => {
                const matchesRole = u.role === fixedRole;
                const matchesStatus = statusFilter === "all" || u.status === statusFilter;
                const matchesSearch =
                    !search.trim() ||
                    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
                    u.email.toLowerCase().includes(search.toLowerCase());
                return matchesRole && matchesStatus && matchesSearch;
            });

            const start = page * PAGE_SIZE;
            const paginated = filtered.slice(start, start + PAGE_SIZE);

            setUsers(paginated);
            setTotal(filtered.length);
            setIsLoading(false);
            return;
        }

        try {
            const response = await listUsers({
                role: fixedRole,
                status: statusFilter === "all" ? undefined : statusFilter,
                search: search.trim() || undefined,
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
            });

            setUsers(response.data.users);
            setTotal(response.data.total);
        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo cargar la lista.";
            alertService.error(message);
        } finally {
            setIsLoading(false);
        }
    }, [fixedRole, statusFilter, search, page]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const updateStatusFilter = (value: STATUS_USERS | "all") => {
        setStatusFilter(value);
        setPage(0);
    };

    const updateSearch = (value: string) => {
        setSearch(value);
        setPage(0);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return {
        users, total, totalPages, page, setPage,
        statusFilter, updateStatusFilter,
        search, updateSearch,
        isLoading, refetch: fetchUsers,
    };
}