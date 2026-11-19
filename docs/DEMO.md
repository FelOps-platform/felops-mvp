# Felops demo runbook

A short, repeatable demo of the full loop: cited answers, approval-gated actions, human takeover,
hosted chat, and the embedded widget.

---

## 1. Start the stack

```bash
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm seed          # idempotent Cairo Threads demo tenant
pnpm dev           # web :3000, worker, widget watch build
```

If the demo tenant is already seeded, `pnpm seed` is safe to run again.

Open:

- Dashboard: <http://localhost:3000/sign-in>
- Hosted chat: <http://localhost:3000/chat/cairo-threads/support>
- Sample store + widget: <http://localhost:3000/demo-store.html>

Demo login:

```text
owner@cairothreads.test
demo-password
```

---

## 2. The prepared state

The demo tenant includes:

- 1 active agent, **Support**, with Arabic + English instructions.
- 3 ready knowledge sources: shipping, returns, store hours.
- 1 enabled HTTP action, **Request refund**, requiring approval.
- A prepared pending refund from a widget conversation (`visitor_salma`).

The dashboard should show **Pending approvals: 1**.

---

## 3. Demo path (about 8 minutes)

### 1. Dashboard

Sign in as Maya. Point at the four counters, the recent activity trail, and the pending approval in
**Needs attention**.

### 2. Approve the prepared refund

Open **Actions & Approvals**.

- Expand the pending **Request refund**.
- Show the parameters, the exact HTTP request, and **Open conversation**.
- Click **Approve**.
- Wait a few seconds and refresh. The run moves to history with **Succeeded**, the response body,
  the approver, and a timestamp.

### 3. Conversation trace and human takeover

Open the conversation from the approved action.

- Show the customer messages, the assistant answer, and the execution trace.
- Click **Take over**.
- Send a human reply, for example: `تم استلام طلبك، هنتواصل معاك خلال 24 ساعة.`
- Explain that the assistant stops replying while a human owns the thread.

### 4. Playground: cited answer, then a new action

Go to **Agents → Support → Playground**.

Ask:

```text
الشحن بياخد كام يوم؟
```

The answer streams in Arabic and cites **Shipping and delivery** and **Returns and refunds**.

Then ask:

```text
عايزة أرجّع الأوردر
```

A new **Request refund** appears in the approval queue. This is the live version of the prepared
demo state.

### 5. Knowledge

Open **Knowledge** (workspace-wide) or **Agents → Support → Knowledge**.

- Show the three ready sources and chunk counts.
- Add a text source such as **Ramadan hours** with a short policy.
- Show it move from `processing` to `ready` after the worker ingests it.
- Ask a question in the playground that is only answered by the new source.

### 6. Hosted page

Open <http://localhost:3000/chat/cairo-threads/support> at a phone width.

- Show the Arabic RTL greeting and composer.
- Ask `الشحن بياخد كام يوم؟` and show the cited answer.
- Return to the dashboard inbox; the hosted conversation appears there.

### 7. Embedded widget

Open <http://localhost:3000/demo-store.html>.

- The sample store is a normal page with the live Felops widget in the bottom-right.
- Open the widget and ask `الشحن بياخد كام يوم؟`, or ask for a refund.
- Show the conversation in the dashboard inbox with channel **widget**.

This is the strongest “real demo” surface: the same agent, same knowledge, same approval queue,
inside a customer-facing storefront.

### 8. Audit and plan

Finish on **Audit trail** to show every request, approval, execution, takeover, and source change.
Open **Settings → Plan** to show the Free plan quotas and the upgrade path.

---

## 4. Useful Arabic prompts

| Prompt | What it demonstrates |
|---|---|
| `الشحن بياخد كام يوم؟` | Retrieval + citation in Arabic |
| `عايزة أرجّع الأوردر` | Action proposal + pending approval |
| `مواعيد العمل إيه؟` | Answer from store-hours knowledge |
| `أنا محتاج أعدل العنوان بعد ما الأوردر اتشحن` | Order-change intent + human handoff |

---

## 5. Expected behavior and limits

- `MOCK_AI=1` is the default. Embeddings are deterministic and answers are extractive, so the demo
  works offline. Set a real `OPENAI_API_KEY` and remove `MOCK_AI=1` for model-generated answers.
- A refund action creates a pending run; it never executes until an owner or admin approves it.
- Approval is idempotent. Double-clicking does not execute the action twice.
- Conversations in `human` state stop automatic replies. The widget shows the takeover notice.
- The public widget is origin-restricted. The demo page is on `http://localhost:3000`, which is in
  the agent allowlist.

---

## 6. If you need a clean run

To rebuild the demo tenant from scratch:

```bash
pnpm seed
```

To start the data services from a clean slate (this deletes local demo data):

```bash
docker compose down -v
docker compose up -d postgres redis
pnpm db:migrate
pnpm seed
```
