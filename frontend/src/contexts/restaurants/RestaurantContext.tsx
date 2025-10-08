"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Restaurant = { id: string; name: string; address: string; owner: string };
type Review = {
    id: string;
    restaurant_id: string;
    author: string;
    timestamp: string;
    text: string;
    rating: number;
    image_url?: string | null;
};
type CreateReviewInput = {
    author: string;
    text: string;
    rating: number;
    image?: File | null;
    restaurant_id?: string;
};

interface RestaurantsContextType {
    items: Restaurant[];
    loading: boolean;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;

    filter: string;
    setFilter: (v: string) => void;

    tagQuery: string;
    setTagQuery: (v: string) => void;

    allTags: string[];
    refreshAllTags: () => Promise<{ data: string[]; error: any }>;

    refresh: () => Promise<{ data: any; error: any }>;
    addRestaurant: (name: string, address: string, owner: string) => Promise<{ data: any; error: any }>;

    reviews: Review[];
    reviewsLoading: boolean;
    reviewsError: string | null;
    refreshReviews: (restaurant_id?: string) => Promise<{ data: any; error: any }>;
    createReview: (input: CreateReviewInput) => Promise<{ data: any; error: any }>;

    addRestaurantTags: (restaurant_id: string, tags: string[]) => Promise<{ data: any; error: any }>;
    fetchTags: (restaurant_id: string) => Promise<{ data: string[]; error: any }>;
}

const RestaurantsContext = createContext<RestaurantsContextType | undefined>(undefined);

const Endpoint = "http://127.0.0.1:5001";

export const RestaurantsProvider = ({ children }: { children: React.ReactNode }) => {
    const [items, setItems] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState<string | null>(null);

    const [filter, setFilter] = useState("");

    const [tagQuery, setTagQuery] = useState("");
    const [allTags, setAllTags] = useState<string[]>([]);

    const refresh = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${Endpoint}/restaurants`, { method: "GET" });
            const data = await res.json();
            if (!res.ok) return { data: null, error: data };

            const rows = Array.isArray(data.restaurants) ? data.restaurants : [];
            const next: Restaurant[] = [];
            for (const r of rows) {
                if (!r) continue;
                const id = typeof r.id === "string" ? r.id : "";
                const name = typeof r.name === "string" ? r.name : "";
                const address = typeof r.address === "string" ? r.address : "";
                const owner = typeof r.owner === "string" ? r.owner : "";
                if (id && name && address && owner) next.push({ id, name, address, owner });
            }
            setItems(next);
            return { data, error: null };
        } catch {
            return { data: null, error: { message: "Network error" } };
        } finally {
            setLoading(false);
        }
    };

    const addRestaurant = async (name: string, address: string, owner: string) => {
        try {
            const n = (name || "").trim();
            const a = (address || "").trim();
            const o = (owner || "").trim();
            if (!n || !a || !o) return { data: null, error: { message: "All fields are required" } };

            const res = await fetch(`${Endpoint}/create_restaurants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: n, address: a, owner: o }),
            });
            const data = await res.json();
            if (!res.ok) return { data: null, error: data };

            const row = data.restaurant;
            if (!row)
                return { data: null, error: { message: "Bad response from server" } };

            const newItem: Restaurant = {
                id: row.id,
                name: row.name,
                address:  row.address,
                owner: row.owner,
            };
            setItems((prev) => [newItem, ...prev]);
            return { data, error: null };
        } catch {
            return { data: null, error: { message: "Network error" } };
        }
    };

    const resolveRestaurantId = (explicit?: string | null) => {
        if (explicit) return explicit;
        if (selectedId) return selectedId;
        try {
            const raw = sessionStorage.getItem("selected_restaurant");
            if (!raw) return "";
            const parsed = JSON.parse(raw);
            return typeof parsed?.id === "string" ? parsed.id : "";
        } catch {
            return "";
        }
    };

    const refreshReviews = async (restaurant_id: string) => {
        try {
            setReviewsLoading(true);
            setReviewsError(null);
            const rid = resolveRestaurantId(restaurant_id);
            if (!rid) return { data: null, error: { message: "missing restaurant_id" } };

            const res = await fetch(
                `${Endpoint}/reviews?restaurant_id=${encodeURIComponent(rid)}`,
                { method: "GET" }
            );
            const data = await res.json();
            if (!res.ok) {
                setReviews([]);
                setReviewsError(data.error);
                return { data: null, error: data };
            }
            const rows = Array.isArray(data.reviews) ? data.reviews : [];
            setReviews(rows);
            return { data, error: null };
        } catch {
            setReviews([]);
            setReviewsError("Network error");
            return { data: null, error: { message: "Network error" } };
        } finally {
            setReviewsLoading(false);
        }
    };

    const createReview = async (input: CreateReviewInput) => {
        try {
            setReviewsError(null);
            const rid = resolveRestaurantId(input.restaurant_id ?? null);
            if (!rid) return { data: null, error: { message: "missing restaurant_id" } };

            const fd = new FormData();
            fd.append("restaurant_id", rid);
            fd.append("author", input.author.trim());
            fd.append("text", input.text.trim());
            fd.append("rating", String(input.rating));
            if (input.image) fd.append("image", input.image);

            const res = await fetch(`${Endpoint}/reviews`, { method: "POST", body: fd } as any);
            const data = await res.json();
            if (!res.ok) {
                setReviewsError(data.error || "Failed to submit review");
                return { data: null, error: data };
            }
            const row = data.review;
            if (!row) {
                setReviewsError("Bad response");
                return { data: null, error: { message: "Bad response" } };
            }
            refreshReviews(rid);
            return { data, error: null };
        } catch {
            setReviewsError("Network error");
            return { data: null, error: { message: "Network error" } };
        }
    };

    const addRestaurantTags = async (restaurant_id: string, tags: string[]) => {
        try {
            const payload = { restaurant_id, tags };
            const res = await fetch(`${Endpoint}/restaurant_tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) return { data: null, error: data };
            return { data, error: null };
        } catch {
            return { data: null, error: { message: "Network error" } };
        }
    };

    /** Tags for a single restaurant (backend returns: [{ tags: [...] }]) */
    const fetchTags = useCallback(
        async (restaurant_id: string): Promise<{ data: string[]; error: any }> => {
            const res = await fetch(
                `${Endpoint}/restaurant_tags?restaurant_id=${encodeURIComponent(restaurant_id)}`
            );
            const json = await res.json();
            if (!res.ok) return { data: [], error: json };
            const tags =
                Array.isArray(json) && Array.isArray(json[0]?.tags) ? (json[0].tags as string[]) : [];
            return { data: tags, error: null };
        },
        []
    );

    /** ALL tags across restaurants (backend returns: { tags: [...] }) */
    const refreshAllTags = useCallback(async (): Promise<{ data: string[]; error: any }> => {
        try {
            const res = await fetch(`${Endpoint}/restaurant_tags_all`);
            const json = await res.json();
            if (!res.ok) return { data: [], error: json };
            const list: string[] = Array.isArray(json?.tags) ? json.tags : [];
            setAllTags(list);
            return { data: list, error: null };
        } catch {
            setAllTags([]);
            return { data: [], error: { message: "Network error" } };
        }
    }, []);

    useEffect(() => {
        refresh();
        refreshAllTags();
    }, [refreshAllTags]);

    return (
        <RestaurantsContext.Provider
            value={{
                items,
                loading,
                selectedId,
                setSelectedId,

                filter,
                setFilter,

                tagQuery,
                setTagQuery,

                allTags,
                refreshAllTags,

                refresh,
                addRestaurant,

                reviews,
                reviewsLoading,
                reviewsError,
                refreshReviews,
                createReview,

                addRestaurantTags,
                fetchTags,
            }}
        >
            {children}
        </RestaurantsContext.Provider>
    );
};

export const useRestaurants = () => {
    const ctx = useContext(RestaurantsContext);
    if (ctx === undefined) {
        throw new Error("useRestaurants must be used within a RestaurantsProvider");
    }
    return ctx;
};
