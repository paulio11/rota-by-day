import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const Rota = () => {
  const [employees, setEmployees] = useState([]);
  const [dayHeaders, setDayHeaders] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [currentWeekStart, setCurrentWeekStart] = useState(getCurrentSunday());

  // ---- Date utilities ----
  function getCurrentSunday() {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday
    const diff = today.getDate() - day;
    const sunday = new Date(today.setDate(diff));
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  }

  const formatDate = (date) => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}_${m}_${y}`;
  };

  // ---- Limits ----
  const minWeekStart = new Date(2025, 9, 19); // 19 Oct 2025
  const maxWeekStart = (() => {
    const d = getCurrentSunday();
    d.setDate(d.getDate() + 14); // 2 weeks ahead
    return d;
  })();

  const rotaFileName = `data/Wall_Schedule_Classic_Review_6departments_(Week_${formatDate(
    currentWeekStart
  )}).csv`;

  // ---- Load CSV when file changes ----
  useEffect(() => {
    const parseRota = async () => {
      try {
        const text = await fetch(rotaFileName).then((res) => {
          if (!res.ok) throw new Error(`File not found: ${rotaFileName}`);
          return res.text();
        });

        const { data } = Papa.parse(text, { header: false });
        const headerRow = data.find((row) => row[0] === "Employee");
        if (!headerRow) return;

        setDayHeaders(headerRow.slice(1, 8));
        setEmployees(
          data
            .filter((row) => row[0] && row[0] !== "Employee")
            .map((row) => ({
              name: row[0],
              shifts: row.slice(1, 8),
            }))
        );
      } catch (err) {
        console.error(err);
        setEmployees([]);
        setDayHeaders([]);
      }
    };

    parseRota();
  }, [rotaFileName]);

  // ---- Navigation ----
  const handlePrev = (e) => {
    e.preventDefault();
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() - 7);
    if (newDate >= minWeekStart) setCurrentWeekStart(newDate);
  };

  const handleNext = (e) => {
    e.preventDefault();
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + 7);
    if (newDate <= maxWeekStart) setCurrentWeekStart(newDate);
  };

  const prevDisabled = currentWeekStart.getTime() <= minWeekStart.getTime();
  const nextDisabled = currentWeekStart.getTime() >= maxWeekStart.getTime();

  // ---- Helper functions ----
  const formatName = (raw = "") => {
    const cleaned = raw.replace(/\s*\(\d+\)\s*$/, "").trim();
    const [last, ...rest] = cleaned.split(/\s+/);
    return rest.length ? `${rest.join(" ")} ${last}` : cleaned;
  };

  const extractShiftTime = (text = "") => {
    const match = text.match(
      /Whole Shift:(\d{1,2}):?(\d{0,2})?\s*-\s*(\d{1,2}):?(\d{0,2})?/
    );
    if (!match) return "";
    const [, sh, sm = "0", eh, em = "0"] = match;
    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(sh)}:${pad(sm)}–${pad(eh)}:${pad(em)}`;
  };

  const timeToMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // ---- Render ----
  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <button onClick={handlePrev} disabled={prevDisabled}>
          Prev
        </button>
        <span style={{ margin: "0 1rem" }}>
          Week starting {currentWeekStart.toLocaleDateString()}
        </span>
        <button onClick={handleNext} disabled={nextDisabled}>
          Next
        </button>
      </form>

      <form>
        <select
          onChange={(e) => setSelectedEmp(e.target.value)}
          value={selectedEmp}
        >
          <option value="">Everyone</option>
          {employees.slice(2).map((emp, i) => {
            const name = formatName(emp.name);
            return (
              <option key={i} value={name}>
                {name}
              </option>
            );
          })}
        </select>
      </form>

      {dayHeaders.map((day, dayIndex) => {
        const shifts = employees
          .filter((e) => !selectedEmp || formatName(e.name) === selectedEmp)
          .map((e) => {
            const shift = extractShiftTime(e.shifts[dayIndex]);
            return shift
              ? {
                  name: formatName(e.name),
                  shift,
                  start: timeToMinutes(shift.split("–")[0]),
                }
              : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.start - b.start);

        if (!shifts.length) return null;

        return (
          <div key={day} style={{ marginBottom: "2rem" }}>
            <h2>{day}</h2>
            <table>
              <tbody>
                {shifts.map(({ name, shift }, i) => (
                  <tr key={i}>
                    <td>{name}</td>
                    <td>{shift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
};

export default Rota;
