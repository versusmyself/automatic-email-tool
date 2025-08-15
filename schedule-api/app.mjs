// schedule-api/app.mjs
import { SchedulerClient, CreateScheduleCommand } from "@aws-sdk/client-scheduler";
import crypto from "crypto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "OPTIONS,POST"
};

const ok  = (b) => ({ statusCode: 200, headers: cors, body: JSON.stringify(b) });
const bad = (m) => ({ statusCode: 400, headers: cors, body: JSON.stringify({ ok: false, error: m }) });
const err = (m) => ({ statusCode: 500, headers: cors, body: JSON.stringify({ ok: false, error: m }) });

const client = new SchedulerClient({});

export const handler = async (event) => {
  if (event?.httpMethod === "OPTIONS") return ok({ ok: true });

  let body;
  try {
    body = JSON.parse(event?.body || "{}");
  } catch {
    return bad("Invalid JSON");
  }

  const { sendAt, to, subject, text, html, replyTo, fromName, fromEmail } = body;

  if (!sendAt) return bad("Missing 'sendAt' (ISO 8601, e.g. 2025-08-15T16:00:00-04:00)");
  if (!to || !subject || (!text && !html)) return bad("Require 'to', 'subject', and 'text' or 'html'");

  const when = new Date(sendAt);
  if (isNaN(when.getTime())) return bad("sendAt not parseable as date");

  // EventBridge Scheduler 'at()' requires UTC, no milliseconds, no trailing Z
  const utcISO = when.toISOString().replace(/\.\d{3}Z$/, ""); // e.g., 2025-08-15T02:03:00

  const name = `email-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  try {
    // Wrap input to mimic API Gateway proxy (so email Lambda still reads event.body)
    const emailPayload = {
      body: JSON.stringify({ to, subject, text, html, replyTo, fromName, fromEmail })
    };

    await client.send(new CreateScheduleCommand({
      Name: name,
      Description: "One-time scheduled email",
      ScheduleExpression: `at(${utcISO})`,
      FlexibleTimeWindow: { Mode: "OFF" },
      Target: {
        Arn: process.env.EMAIL_FUNCTION_ARN,
        RoleArn: process.env.SCHEDULER_INVOKE_ROLE,
        Input: JSON.stringify(emailPayload)
      }
    }));

    return ok({ ok: true, scheduleName: name, when: utcISO });
  } catch (e) {
    return err(e?.message || "CreateSchedule failed");
  }
};
