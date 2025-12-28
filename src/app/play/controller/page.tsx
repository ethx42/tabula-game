"use client";

/**
 * Controller Page
 *
 * Mobile-optimized page for the Remote Controller interface.
 * Handles room joining, WebSocket connection, and game control.
 *
 * @see SRD §5.2 Remote Controller Layout
 */

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RemoteController } from "../_components/remote-controller";
import { loadDemoDeck } from "@/lib/game/deck-loader";
import type { GameSession, DeckDefinition, GameStatus } from "@/lib/types/game";
import type { ConnectionStatus } from "../_components/connection-status";

// ============================================================================
// TYPES
// ============================================================================

type ControllerPageState =
  | { status: "joining" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "connected"; session: GameSession };

// ============================================================================
// SHUFFLE UTILITY (same as host page)
// ============================================================================

function seededShuffle<T>(array: readonly T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;

  const random = () => {
    currentSeed = (currentSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(currentSeed ^ (currentSeed >>> 15), 1 | currentSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// ============================================================================
// SESSION FACTORY
// ============================================================================

function createInitialSession(
  deck: DeckDefinition,
  roomId: string
): GameSession {
  const seed = generateSeed();
  const shuffledItemIds = seededShuffle(
    deck.items.map((item) => item.id),
    seed
  );

  return {
    id: roomId,
    deck,
    boards: [],
    shuffledDeck: shuffledItemIds,
    currentIndex: -1,
    currentItem: null,
    history: [],
    totalItems: deck.items.length,
    shuffleSeed: seed,
    status: "ready",
    connection: {
      hostConnected: false,
      controllerConnected: true,
      controllerId: "local-controller",
      lastPing: Date.now(),
    },
  };
}

// ============================================================================
// JOIN FORM COMPONENT
// ============================================================================

interface JoinFormProps {
  onJoin: (roomId: string) => void;
  error?: string;
}

function JoinForm({ onJoin, error }: JoinFormProps) {
  const [roomCode, setRoomCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length >= 4) {
      onJoin(roomCode.toUpperCase());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric, convert to uppercase
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    setRoomCode(value.slice(0, 4));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-950 via-amber-900 to-amber-950 p-6">
      <div className="w-full max-w-sm">
        {/* Logo/Title */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl font-bold text-amber-100">
            Tabula
          </h1>
          <p className="mt-2 text-amber-300/70">Join a game session</p>
        </div>

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="room-code"
              className="mb-2 block text-sm font-medium text-amber-200"
            >
              Room Code
            </label>
            <input
              id="room-code"
              type="text"
              value={roomCode}
              onChange={handleInputChange}
              placeholder="ABCD"
              maxLength={4}
              autoComplete="off"
              autoCapitalize="characters"
              className="w-full rounded-xl border-2 border-amber-700/50 bg-amber-900/50 px-4 py-4 text-center font-mono text-3xl tracking-[0.5em] text-amber-100 placeholder-amber-600/50 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/50 p-3 text-center text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={roomCode.length < 4}
            className="w-full rounded-xl bg-amber-500 py-4 text-lg font-bold text-amber-950 transition-colors hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:bg-amber-700/50 disabled:text-amber-400/50"
          >
            Join Game
          </button>
        </form>

        {/* Help text */}
        <p className="mt-6 text-center text-sm text-amber-400/60">
          Enter the 4-character code shown on the host screen
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SCREEN
// ============================================================================

function LoadingScreen({ message = "Connecting..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-950 via-amber-900 to-amber-950">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto" />
        <p className="font-serif text-xl text-amber-200">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CONTENT COMPONENT
// ============================================================================

function ControllerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomIdFromUrl = searchParams?.get("room");

  const [state, setState] = useState<ControllerPageState>({
    status: roomIdFromUrl ? "loading" : "joining",
  });
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [joinError, setJoinError] = useState<string | undefined>();

  // Handle joining a room
  const handleJoin = useCallback(
    (roomId: string) => {
      setState({ status: "loading" });
      setJoinError(undefined);
      router.push(`/play/controller?room=${roomId}`);
    },
    [router]
  );

  // Initialize session when room ID is available
  useEffect(() => {
    // Only run when we have a room ID to connect to
    if (!roomIdFromUrl) return;

    // Store as non-null for closure
    const roomId: string = roomIdFromUrl;
    let cancelled = false;

    const initSession = async () => {
      try {
        setConnectionStatus("reconnecting");
        const deck = await loadDemoDeck();
        const session = createInitialSession(deck, roomId);

        // Simulate connection delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!cancelled) {
          setState({ status: "connected", session });
          setConnectionStatus("connected");
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error ? error.message : "Failed to connect",
          });
          setConnectionStatus("error");
        }
      }
    };

    initSession();

    return () => {
      cancelled = true;
    };
  }, [roomIdFromUrl]);

  // Game actions
  const handleDrawCard = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "connected") return prev;

      const { session } = prev;
      const nextIndex = session.currentIndex + 1;

      if (nextIndex >= session.totalItems) {
        return {
          status: "connected",
          session: {
            ...session,
            status: "finished",
          },
        };
      }

      const nextItemId = session.shuffledDeck[nextIndex];
      const nextItem =
        session.deck.items.find((i) => i.id === nextItemId) || null;

      const newHistory =
        session.currentItem !== null
          ? [...session.history, session.currentItem]
          : session.history;

      const newStatus: GameStatus =
        nextIndex === session.totalItems - 1 ? "finished" : "playing";

      return {
        status: "connected",
        session: {
          ...session,
          currentIndex: nextIndex,
          currentItem: nextItem,
          history: newHistory,
          status: newStatus,
        },
      };
    });
  }, []);

  const handlePause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "connected") return prev;
      return {
        status: "connected",
        session: {
          ...prev.session,
          status: "paused",
        },
      };
    });
  }, []);

  const handleResume = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "connected") return prev;
      return {
        status: "connected",
        session: {
          ...prev.session,
          status: "playing",
        },
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "connected") return prev;

      const newSeed = generateSeed();
      const shuffledItemIds = seededShuffle(
        prev.session.deck.items.map((item) => item.id),
        newSeed
      );

      return {
        status: "connected",
        session: {
          ...prev.session,
          shuffledDeck: shuffledItemIds,
          currentIndex: -1,
          currentItem: null,
          history: [],
          shuffleSeed: newSeed,
          status: "ready",
        },
      };
    });
  }, []);

  const handleRetryConnection = useCallback(() => {
    if (roomIdFromUrl) {
      setState({ status: "loading" });
      setConnectionStatus("reconnecting");
      // Re-trigger connection
      window.location.reload();
    }
  }, [roomIdFromUrl]);

  // Render based on state
  if (state.status === "joining") {
    return <JoinForm onJoin={handleJoin} error={joinError} />;
  }

  if (state.status === "loading") {
    return <LoadingScreen message="Connecting to game..." />;
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-950 via-amber-900 to-amber-950 p-6">
        <div className="max-w-md rounded-2xl bg-red-900/50 p-6 text-center">
          <h1 className="mb-4 font-serif text-2xl font-bold text-red-200">
            Connection Error
          </h1>
          <p className="text-red-300">{state.message}</p>
          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => {
                setState({ status: "joining" });
                router.push("/play/controller");
              }}
              className="rounded-full bg-amber-800/50 px-4 py-2 font-medium text-amber-200"
            >
              Try Different Code
            </button>
            <button
              onClick={handleRetryConnection}
              className="rounded-full bg-amber-500 px-4 py-2 font-semibold text-amber-950"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RemoteController
      session={state.session}
      connectionStatus={connectionStatus}
      onDrawCard={handleDrawCard}
      onPause={handlePause}
      onResume={handleResume}
      onReset={handleReset}
      onRetryConnection={handleRetryConnection}
    />
  );
}

// ============================================================================
// PAGE EXPORT (Wrapped in Suspense for useSearchParams)
// ============================================================================

export default function ControllerPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ControllerPageContent />
    </Suspense>
  );
}

