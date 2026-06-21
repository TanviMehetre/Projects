document.getElementById('validate').addEventListener('click', onValidateClick);

function onValidateClick(e) {
    e.preventDefault();
    const date = document.getElementById('date').value.trim();
    const format = document.getElementById('date_format').value.trim();
    let output = document.getElementById('validate_output');
    const result = Validate(date, format);
    output.innerHTML = result.message;
    output.className = result.class_name;
    return result.validation;
}

function Validate(date, format) {
    let delimiter = "";
    let delimiters = ['-', '/', '.'];
    let validation = false;
    let datePrint = date;
    let count = 0;
    [...format].forEach(val => { if (delimiters.includes(val) && delimiter === "") { delimiter = val; } });
    if (delimiter != "") {
        let dateCheck = date.split(delimiter);
        let formatCheck = format.split(delimiter);
        if (dateCheck.length === 3 && formatCheck.length === 3) {
            datePrint = "";
            let day, month, year = 0;
            const formatMap = {}; //using objects
            let key, dateVal;
            for (let i = 0; i < 3; i++) {
                key = formatCheck[i].length == 0 ? validation = false : formatCheck[i].toUpperCase();
                if (key.length > 0) {
                    let allSame = [...key].every(ch => ch === key[0]);
                    if (!allSame) {
                        validation = false;
                        break;
                    }
                }
                dateVal = parseInt(dateCheck[i]);
                if (dateVal < 0 || ((key[0] === 'Y') ? formatCheck[i].length > 4 : formatCheck[i].length > 2) || dateCheck[i].length > 4 || formatCheck[i].length == 0 || !isNaN(formatCheck[i])) {
                    validation = false;
                    break;
                }
                if (key[0] === 'Y' && dateCheck[i].length <= 2 && key.length <= 4) {
                    dateVal += (dateVal < 50) ? 2000 : 1900;
                }
                formatMap[key[0]] = dateVal;
                if (count < 2) {
                    if (dateVal < 10)
                        datePrint += dateCheck[i] + delimiter;
                    else
                        datePrint += dateVal + delimiter;
                    count++;
                } else {
                    datePrint += dateVal;
                }
            }
            day = formatMap['D'];
            month = formatMap['M'];
            year = formatMap['Y'];
            if ((month > 0 && month <= 12) && (day >= 1) && year <= 9999) {
                let days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
                let Days = 0;
                if (month == 2 && ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0))) {
                    days[1] = 29;
                }
                Days = days[month - 1];
                if (day <= Days) {
                    validation = true;
                }
            }
        }
    }
    return { validation: validation, message: (date == "" || format == "") ? `One or more input fields are empty` : (validation ? `The input ${datePrint} is valid for the given format ${format}.` : `The input ${date} is invalid for the given format ${format}.`), class_name: validation ? "text-success text-center m-4" : "text-danger text-center m-4" };
}