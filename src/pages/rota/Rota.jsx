import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const Rota = () => {
  const [data, setData] = useState([]);
  const [dayHeaders, setDayHeaders] = useState([]);

  useEffect(() => {
    fetch("/rota1.csv")
      .then((res) => res.text())
      .then((text) => {
        const result = Papa.parse(text, { header: false });
        // Find header row with day names and dates
        const headerRow = result.data.find((row) => row[0] === "Employee");
        const dayCols = headerRow ? rowSlice(headerRow, 1, 8) : [];

        setDayHeaders(dayCols);

        // Remaining rows are employees
        const employees = result.data
          .filter((row) => row[0] && row[0] !== "Employee")
          .map((row) => ({
            name: row[0],
            shifts: rowSlice(row, 1, 8),
          }));
        setData(employees);
      });
  }, []);

  const rowSlice = (row, start, end) => row.slice(start, end);

  const formatName = (rawName = "") => {
    const cleaned = rawName.replace(/\s*\(\d+\)\s*$/, "").trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      const first = parts.slice(1).join(" ");
      const last = parts[0];
      return `${first} ${last}`;
    }
    return cleaned;
  };

  const extractShiftTime = (text = "") => {
    const match = text.match(
      /Whole Shift:(\d{1,2}):?(\d{0,2})?\s*-\s*(\d{1,2}):?(\d{0,2})?/
    );
    if (!match) return "";
    const [, startH, startM, endH, endM] = match;
    const pad = (num) => num.toString().padStart(2, "0");
    const start = `${pad(startH)}:${pad(startM || 0)}`;
    const end = `${pad(endH)}:${pad(endM || 0)}`;
    return `${start}–${end}`;
  };

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  return (
    <>
      <div>
        {dayHeaders.map((dayLabel, dayIndex) => {
          const employeesWithShift = data
            .map((emp) => {
              const rawShift = emp.shifts[dayIndex] || "";
              const shift = extractShiftTime(rawShift);
              if (!shift) return null;
              return {
                name: formatName(emp.name),
                shift,
                startMinutes: timeToMinutes(shift.split("–")[0]),
              };
            })
            .filter(Boolean)
            .sort((a, b) => a.startMinutes - b.startMinutes);

          if (employeesWithShift.length === 0) return null;

          return (
            <div key={dayLabel} style={{ marginBottom: "2rem" }}>
              <h2>{dayLabel}</h2>
              <table>
                <tbody>
                  {employeesWithShift.map((emp, i) => (
                    <tr key={i}>
                      <td>{emp.name}</td>
                      <td>{emp.shift}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Rota;
