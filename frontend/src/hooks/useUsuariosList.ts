import { useEffect, useState, useCallback } from "react";
import { listUsers } from "@/api/user";
import { type ApiUser, type ROLES_USER, type STATUS_USERS } from "@/types/index";
import { alertService } from "@/services/alertService";

const PAGE_SIZE = 20;

/** Tipos de cuenta que se listan en "Usuarios" (el admin no se incluye). */
export const TIPOS_SOLICITANTES: ROLES_USER[] = ["organization", "volunteer", "citizen"];

export type TipoFiltro = ROLES_USER | "all";

export function useUsuariosList() {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [total, setTotal] = useState(0);
    const [typeFilter, setTypeFilter] = useState<TipoFiltro>("all");
    const [statusFilter, setStatusFilter] = useState<STATUS_USERS | "all">("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await listUsers({
                roles: typeFilter === "all" ? TIPOS_SOLICITANTES : [typeFilter],
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
    }, [typeFilter, statusFilter, search, page]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const updateTypeFilter = (value: TipoFiltro) => {
        setTypeFilter(value);
        setPage(0);
    };

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
        typeFilter, updateTypeFilter,
        statusFilter, updateStatusFilter,
        search, updateSearch,
        isLoading, refetch: fetchUsers,
    };
}
