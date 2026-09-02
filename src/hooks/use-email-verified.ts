"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

let accountCheck: Promise<string | null> | null = null;
let sessionPushed = false;

function fetchAccountEmailVerified(): Promise<string | null> {
  if (!accountCheck) {
    accountCheck = fetch("/api/account")
      .then((res) => res.json())
      .then(
        (data: { user?: { emailVerified?: string | null } }) =>
          data.user?.emailVerified ?? null,
      )
      .catch(() => null)
      .then((value) => {
        if (!value) accountCheck = null;
        return value;
      });
  }
  return accountCheck;
}

export function resetEmailVerifiedCheck() {
  accountCheck = null;
  sessionPushed = false;
}

/** True when the account email is verified in session or on the server. */
export function useEmailVerified(): boolean {
  const { data: session, status, update } = useSession();
  const fromSession = Boolean(session?.user?.emailVerified);
  const [fromAccount, setFromAccount] = useState(false);

  useEffect(() => {
    if (fromSession) {
      setFromAccount(true);
      return;
    }
    if (status === "loading" || !session?.user?.id) return;

    const apply = (value: string | null) => {
      if (!value) return;
      setFromAccount(true);
      if (!sessionPushed) {
        sessionPushed = true;
        void update({ emailVerified: value });
      }
    };

    void fetchAccountEmailVerified().then(apply);

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      accountCheck = null;
      void fetchAccountEmailVerified().then(apply);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fromSession, session?.user?.id, status, update]);

  return fromSession || fromAccount;
}
