/**
 * Returns the init-script SOURCE STRING injected into the Playwright page
 * via `page.addInitScript({ content: buildWalletShimScript(accountIndex) })`.
 * Runs in the page's own JS context, before any page script — so it must be
 * self-contained plain JS with no imports. wagmi's injected connector
 * detects this as `window.ethereum` from first paint.
 *
 * Account identity + tx signing (methods in HELPER_METHODS below) are
 * delegated to the Node-side wallet-server.ts companion via same-origin
 * fetch; every other read-only JSON-RPC method is forwarded straight to the
 * public Hardhat node.
 */
export function buildWalletShimScript(accountIndex: 0 | 1): string {
  const helperUrl = `http://127.0.0.1:8555/rpc`;
  const rpcUrl = "http://127.0.0.1:8545";
  const helperMethods = ["eth_requestAccounts", "eth_accounts", "eth_chainId", "eth_sendTransaction"];

  // accountIndex is currently informational only (the helper server is
  // started for a fixed account by the caller in capture.ts) — kept as a
  // parameter so a future caller could run two helper servers on two ports
  // for a two-wallet scenario without changing this function's shape.
  void accountIndex;

  return `
    (function () {
      var HELPER_URL = ${JSON.stringify(helperUrl)};
      var RPC_URL = ${JSON.stringify(rpcUrl)};
      var HELPER_METHODS = ${JSON.stringify(helperMethods)};
      var listeners = {};

      async function request(args) {
        var method = args.method;
        var params = args.params || [];
        var isHelperMethod = HELPER_METHODS.indexOf(method) !== -1;
        var target = isHelperMethod ? HELPER_URL : RPC_URL;
        var body = isHelperMethod
          ? JSON.stringify({ method: method, params: params })
          : JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: method, params: params });
        var res = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
        });
        var json = await res.json();
        if (json.error) {
          throw new Error(typeof json.error === "string" ? json.error : json.error.message || "RPC error");
        }
        return json.result;
      }

      window.ethereum = {
        isMetaMask: true,
        request: request,
        on: function (event, listener) {
          listeners[event] = listeners[event] || [];
          listeners[event].push(listener);
        },
        removeListener: function (event, listener) {
          if (!listeners[event]) return;
          listeners[event] = listeners[event].filter(function (l) { return l !== listener; });
        },
      };
    })();
  `;
}
