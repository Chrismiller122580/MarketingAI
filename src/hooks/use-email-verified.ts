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
      .catch(() => null);
  }
  return accountCheck;
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

    void fetchAccountEmailVerified().then((value) => {
      if (!value) return;
      setFromAccount(true);
      if (!sessionPushed) {
        sessionPushed = true;
        void update({ emailVerified: value });
      }
    });
  }, [fromSession, session?.user?.id, status, update]);

  return fromSession || fromAccount;
}
