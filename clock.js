(function () {
  "use strict";

  var CDF_DAY_SECONDS = 21600;
  var CDF_HOUR_SECONDS = 900;
  var DAY_OFFSET_CDF_HOURS = -8;

  var timeReadout = document.getElementById("timeReadout");
  var dateReadout = document.getElementById("dateReadout");
  var formatToggle = document.getElementById("formatToggle");

  function queryFormat() {
    var params = new URLSearchParams(window.location.search);
    var value = params.get("format");
    if (value === "24") return "24";
    if (value === "12") return "12";
    return null;
  }

  var timeFormat = queryFormat() || "12";

  function positiveMod(value, modBy) {
    var result = value % modBy;
    if (result < 0) result += modBy;
    return result;
  }

  function twoDigits(value) {
    if (value < 10) return "0" + value;
    return String(value);
  }

  function cdfDaySecond() {
    var unixSeconds = Math.floor(Date.now() / 1000);
    var offsetSeconds = DAY_OFFSET_CDF_HOURS * CDF_HOUR_SECONDS;
    return positiveMod(unixSeconds + offsetSeconds, CDF_DAY_SECONDS);
  }

  function cdfHour24() {
    return Math.floor(cdfDaySecond() / CDF_HOUR_SECONDS);
  }

  function cdfMinute() {
    var secondIntoHour = cdfDaySecond() % CDF_HOUR_SECONDS;
    return Math.floor((secondIntoHour * 60) / CDF_HOUR_SECONDS);
  }

  function cdfSecond() {
    var secondIntoHour = cdfDaySecond() % CDF_HOUR_SECONDS;
    return Math.floor((secondIntoHour * 3600) / CDF_HOUR_SECONDS) % 60;
  }

  function cdfTime12() {
    var hour = cdfHour24();
    var suffix = hour >= 12 ? "PM" : "AM";
    var displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    return displayHour + ":" + twoDigits(cdfMinute()) + ":" + twoDigits(cdfSecond()) + " " + suffix;
  }

  function cdfTime24() {
    return twoDigits(cdfHour24()) + ":" + twoDigits(cdfMinute()) + ":" + twoDigits(cdfSecond());
  }

  function cdfDayPercent() {
    return Math.floor((cdfDaySecond() / CDF_DAY_SECONDS) * 100);
  }

  function updateClock() {
    timeReadout.textContent = timeFormat === "24" ? cdfTime24() : cdfTime12();
    formatToggle.textContent = timeFormat === "24" ? "24 Hour" : "12 Hour";
    dateReadout.textContent = "Camden Falls Day Cycle - " + cdfDayPercent() + "% complete";
  }

  updateClock();
  window.setInterval(updateClock, 250);
}());
