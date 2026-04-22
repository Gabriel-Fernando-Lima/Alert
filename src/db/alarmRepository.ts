import db from "./schema";
import { Alarm } from "../store/alarmStore";

export const alarmRepository = {
  getAll(uid: string): Alarm[] {
    const raw = db.getAllSync(
      "SELECT * FROM alarms WHERE uid=? ORDER BY hour ASC, minute ASC",
      [uid]
    ) as any[];
    return raw.map((a) => ({
      ...a,
      active: a.active === 1,
      days: typeof a.days === "string" ? JSON.parse(a.days) : a.days,
    }));
  },

  insert(alarm: Alarm) {
    db.runSync(
      `INSERT INTO alarms (id, uid, label, hour, minute, days, sound, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [alarm.id, alarm.uid, alarm.label, alarm.hour, alarm.minute,
       JSON.stringify(alarm.days), alarm.sound, alarm.active ? 1 : 0, alarm.created_at]
    );
  },

  update(alarm: Alarm) {
    db.runSync(
      `UPDATE alarms SET label=?, hour=?, minute=?, days=?, sound=?, active=? WHERE id=? AND uid=?`,
      [alarm.label, alarm.hour, alarm.minute, JSON.stringify(alarm.days),
       alarm.sound, alarm.active ? 1 : 0, alarm.id, alarm.uid]
    );
  },

  delete(id: string, uid: string) {
    db.runSync("DELETE FROM alarms WHERE id=? AND uid=?", [id, uid]);
  },

  toggleActive(id: string, active: boolean, uid: string) {
    db.runSync("UPDATE alarms SET active=? WHERE id=? AND uid=?", [active ? 1 : 0, id, uid]);
  },
};