"use strict";

const $ = (selector) => document.querySelector(selector);

const calculator = $("#calculator");
const expressionDisplay = $("#expression");
const resultDisplay = $("#result");
const statusDisplay = $("#app-status");
const scientificPanel = $("#scientific-panel");
const historyPanel = $("#history-panel");
const historyList = $("#history-list");

const state = {
    expression: "",
    result: "0",
    lastAnswer: 0,
    memory: 0,
    history: [],
    justCalculated: false,
    hasError: false,
    scientific: false,
    degrees: true,
    theme: "dark"
};

const MAX_LENGTH = 180;
const OPERATORS = ["+", "−", "×", "÷", "^"];

function formatNumber(value) {
    if (!Number.isFinite(value)) {
        throw new Error("Math error");
    }

    if (Object.is(value, -0)) value = 0;

    if (Number.isInteger(value) && Math.abs(value) < 1e15) {
        return value.toLocaleString("en-US", {
            useGrouping: false
        });
    }

    return Number(value.toPrecision(12)).toString();
}

function updateDisplay() {
    expressionDisplay.textContent = state.expression;

    resultDisplay.textContent = state.result;

    resultDisplay.classList.toggle("is-error", state.hasError);

    statusDisplay.textContent = state.hasError
        ? "Calculation error"
        : "";
}

function showError(message = "Error") {
    state.result = message;
    state.hasError = true;
    state.justCalculated = false;

    updateDisplay();
}

function clearAll() {
    state.expression = "";
    state.result = "0";
    state.hasError = false;
    state.justCalculated = false;

    updateDisplay();
}

function clearEntry() {
    if (state.hasError) {
        clearAll();
        return;
    }

    state.expression = state.expression.replace(
        /(?:\d+\.?\d*|\.\d+|π|e|Ans|[)])$/,
        ""
    );

    state.result = state.expression || "0";
    state.justCalculated = false;

    updateDisplay();
}

function appendNumber(number) {
    if (!/^\d$/.test(number)) return;

    if (state.hasError) clearAll();

    if (state.justCalculated) {
        state.expression = "";
        state.result = "0";
        state.justCalculated = false;
    }

    if (state.expression.length >= MAX_LENGTH) return;

    const match = state.expression.match(/(\d*\.?\d*)$/);
    const current = match ? match[0] : "";

    if (current === "0" && number === "0") return;

    if (current === "0" && number !== "0") {
        state.expression = state.expression.slice(0, -1);
    }

    state.expression += number;
    state.result = state.expression;

    updateDisplay();
}

function appendDecimal() {
    if (state.hasError) clearAll();

    if (state.justCalculated) {
        state.expression = "";
        state.justCalculated = false;
    }

    if (state.expression.length >= MAX_LENGTH) return;

    const match = state.expression.match(/(\d*\.?\d*)$/);
    const current = match ? match[0] : "";

    if (current.includes(".")) return;

    if (
        state.expression === "" ||
        OPERATORS.includes(state.expression.slice(-1)) ||
        state.expression.endsWith("(")
    ) {
        state.expression += "0.";
    } else {
        state.expression += ".";
    }

    state.result = state.expression;
    updateDisplay();
}

function appendOperator(operator) {
    if (!OPERATORS.includes(operator)) return;

    if (state.hasError) clearAll();

    if (state.expression.length >= MAX_LENGTH) return;

    if (state.justCalculated) {
        state.expression = state.result;
        state.justCalculated = false;
    }

    if (!state.expression) {
        if (operator === "−") {
            state.expression = "−";
            updateDisplay();
        }
        return;
    }

    const last = state.expression.slice(-1);

    if (OPERATORS.includes(last)) {
        if (operator === "−" && last !== "−") {
            state.expression += operator;
        } else {
            state.expression =
                state.expression.slice(0, -1) + operator;
        }
    } else if (last === "(") {
        if (operator === "−") {
            state.expression += operator;
        } else {
            return;
        }
    } else {
        state.expression += operator;
    }

    state.result = state.expression;
    updateDisplay();
}

function appendParenthesis(value) {
    if (value !== "(" && value !== ")") return;

    if (state.hasError) clearAll();

    if (state.expression.length >= MAX_LENGTH) return;

    if (state.justCalculated && value === "(") {
        state.expression = "";
        state.justCalculated = false;
    }

    if (value === "(") {
        const last = state.expression.slice(-1);

        if (
            /[\d.)πe]$/.test(state.expression) ||
            state.expression.endsWith("Ans")
        ) {
            state.expression += "×";
        }

        state.expression += "(";
    } else {
        const opens = (state.expression.match(/\(/g) || []).length;
        const closes = (state.expression.match(/\)/g) || []).length;
        const last = state.expression.slice(-1);

        if (
            opens > closes &&
            last &&
            !OPERATORS.includes(last) &&
            last !== "("
        ) {
            state.expression += ")";
        }
    }

    state.result = state.expression || "0";
    updateDisplay();
}

function backspace() {
    if (state.hasError) {
        clearAll();
        return;
    }

    if (state.justCalculated) {
        state.justCalculated = false;
    }

    state.expression = state.expression.slice(0, -1);
    state.result = state.expression || "0";

    updateDisplay();
}

function toggleSign() {
    if (state.hasError) clearAll();

    if (state.justCalculated) {
        state.expression = state.result;
        state.justCalculated = false;
    }

    if (!state.expression) {
        state.expression = "−";
        updateDisplay();
        return;
    }

    const match = state.expression.match(/(\d*\.?\d+)$/);

    if (match) {
        const start = match.index;
        const before = state.expression.slice(0, start);
        const number = match[0];

        if (before.endsWith("−")) {
            const previous = before.slice(0, -1);

            if (
                !previous ||
                OPERATORS.includes(previous.slice(-1)) ||
                previous.endsWith("(")
            ) {
                state.expression = previous + number;
            } else {
                state.expression = before + number;
            }
        } else {
            state.expression = before + "−" + number;
        }
    } else if (state.expression.startsWith("−")) {
        state.expression = state.expression.slice(1);
    }

    state.result = state.expression || "0";
    updateDisplay();
}

function applyPercent() {
    if (state.hasError) return;

    const match = state.expression.match(/(\d*\.?\d+)$/);

    if (!match) return;

    const start = match.index;
    const value = Number(match[0]) / 100;

    if (!Number.isFinite(value)) {
        showError();
        return;
    }

    state.expression =
        state.expression.slice(0, start) + formatNumber(value);

    state.result = state.expression;
    state.justCalculated = false;

    updateDisplay();
}

function tokenize(input) {
    const source = input
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/π/g, "pi");

    const tokens = [];
    const pattern =
        /\d*\.?\d+(?:e[+-]?\d+)?|(?:pi|Ans|sin|cos|tan|sqrt|log|ln|abs|exp|fact|inv)|[()+\-*/^!]/gi;

    let position = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
        const gap = source.slice(position, match.index);

        if (gap.trim() !== "") {
            throw new Error("Invalid expression");
        }

        tokens.push(match[0]);
        position = pattern.lastIndex;
    }

    if (source.slice(position).trim() !== "") {
        throw new Error("Invalid expression");
    }

    if (!tokens.length) {
        throw new Error("Empty expression");
    }

    return tokens;
}

function factorial(value) {
    if (
        !Number.isInteger(value) ||
        value < 0 ||
        value > 170
    ) {
        throw new Error("Invalid factorial");
    }

    let result = 1;

    for (let i = 2; i <= value; i++) {
        result *= i;
    }

    return result;
}

function evaluateExpression(input) {
    const tokens = tokenize(input);
    let index = 0;

    function peek() {
        return tokens[index];
    }

    function consume() {
        return tokens[index++];
    }

    function parsePrimary() {
        const token = consume();

        if (token === undefined) {
            throw new Error("Incomplete expression");
        }

        if (token === "(") {
            const value = parseAddSub();

            if (consume() !== ")") {
                throw new Error("Missing parenthesis");
            }

            return value;
        }

        if (token === "+") return parseUnary();
        if (token === "-") return -parseUnary();

        if (/^\d/.test(token) || token.startsWith(".")) {
            const value = Number(token);

            if (!Number.isFinite(value)) {
                throw new Error("Invalid number");
            }

            return value;
        }

        if (/^pi$/i.test(token)) return Math.PI;
        if (/^e$/i.test(token)) return Math.E;
        if (/^ans$/i.test(token)) return state.lastAnswer;

        throw new Error("Invalid expression");
    }

    function parsePostfix() {
        let value = parsePrimary();

        while (peek() === "!") {
            consume();
            value = factorial(value);
        }

        return value;
    }

    function parseUnary() {
        if (peek() === "+") {
            consume();
            return parseUnary();
        }

        if (peek() === "-") {
            consume();
            return -parseUnary();
        }

        return parsePostfix();
    }

    function parsePower() {
        let value = parseUnary();

        if (peek() === "^") {
            consume();
            value = Math.pow(value, parsePower());
        }

        return value;
    }

    function parseMultiplyDivide() {
        let value = parsePower();

        while (peek() === "*" || peek() === "/") {
            const operator = consume();
            const right = parsePower();

            if (operator === "/" && right === 0) {
                throw new Error("Cannot divide by zero");
            }

            value = operator === "*"
                ? value * right
                : value / right;
        }

        return value;
    }

    function parseAddSub() {
        let value = parseMultiplyDivide();

        while (peek() === "+" || peek() === "-") {
            const operator = consume();
            const right = parseMultiplyDivide();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    const result = parseAddSub();

    if (index !== tokens.length) {
        throw new Error("Invalid expression");
    }

    if (!Number.isFinite(result)) {
        throw new Error("Math error");
    }

    return result;
}

function calculate() {
    if (!state.expression || state.hasError) return;

    try {
        const original = state.expression;
        const normalized = original
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/−/g, "-");

        const result = evaluateExpression(normalized);
        const formatted = formatNumber(result);

        state.history.unshift({
            expression: original,
            result: formatted
        });

        state.lastAnswer = result;
        state.expression = formatted;
        state.result = formatted;
        state.justCalculated = true;
        state.hasError = false;

        updateDisplay();

        resultDisplay.classList.remove("is-updated");
        void resultDisplay.offsetWidth;
        resultDisplay.classList.add("is-updated");

    } catch (error) {
        showError(
            error.message === "Cannot divide by zero"
                ? "Cannot divide by zero"
                : "Error"
        );
    }
}

function handleButton(action, button) {
    if (button.dataset.number !== undefined) {
        appendNumber(button.dataset.number);
        return;
    }

    if (button.dataset.operator) {
        appendOperator(button.dataset.operator);
        return;
    }

    switch (action) {
        case "clear-all":
            clearAll();
            break;

        case "clear-entry":
            clearEntry();
            break;

        case "decimal":
            appendDecimal();
            break;

        case "toggle-sign":
            toggleSign();
            break;

        case "percent":
            applyPercent();
            break;

        case "backspace":
            backspace();
            break;

        case "calculate":
            calculate();
            break;

        case "open-paren":
            appendParenthesis("(");
            break;

        case "close-paren":
            appendParenthesis(")");
            break;
    }
}

calculator.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action], button[data-number], button[data-operator]");

    if (!button || !calculator.contains(button)) return;

    handleButton(button.dataset.action, button);
});

updateDisplay();
function appendFunction(name) {
    if (state.hasError) clearAll();

    if (state.justCalculated) {
        state.expression = state.result;
        state.justCalculated = false;
    }

    if (state.expression.length >= MAX_LENGTH) return;

    const functions = [
        "sin", "cos", "tan", "sqrt", "log",
        "ln", "abs", "exp", "fact", "inv"
    ];

    if (!functions.includes(name)) return;

    state.expression += name + "(";
    state.result = state.expression;

    updateDisplay();
}

function applyScientific(action) {
    const expression = state.expression;

    switch (action) {
        case "square":
            if (!expression) return;
            state.expression = `(${expression})^2`;
            break;

        case "power":
            if (!expression) return;
            state.expression += "^";
            break;

        case "sqrt":
            appendFunction("sqrt");
            return;

        case "reciprocal":
            appendFunction("inv");
            return;

        case "factorial":
            if (!expression) return;
            state.expression += "!";
            break;

        case "pi":
            state.expression += "π";
            break;

        case "e":
            state.expression += "e";
            break;

        case "ans":
            state.expression += "Ans";
            break;

        case "sin":
        case "cos":
        case "tan":
        case "log":
        case "ln":
            appendFunction(action);
            return;

        case "degree":
        case "angle-mode":
            state.degrees = !state.degrees;
            updateAngleButton();
            return;

        default:
            return;
    }

    if (state.expression.length > MAX_LENGTH) {
        showError("Expression too long");
        return;
    }

    state.result = state.expression;
    state.justCalculated = false;

    updateDisplay();
}

function updateAngleButton() {
    const button = document.querySelector(
        '[data-action="angle-mode"], [data-action="degree"]'
    );

    if (button) {
        button.textContent = state.degrees ? "DEG" : "RAD";
    }
}

function evaluateScientific(input) {
    const functions = {
        sin: (x) => Math.sin(state.degrees ? x * Math.PI / 180 : x),
        cos: (x) => Math.cos(state.degrees ? x * Math.PI / 180 : x),
        tan: (x) => Math.tan(state.degrees ? x * Math.PI / 180 : x),
        sqrt: (x) => {
            if (x < 0) throw new Error("Invalid square root");
            return Math.sqrt(x);
        },
        log: (x) => {
            if (x <= 0) throw new Error("Invalid logarithm");
            return Math.log10(x);
        },
        ln: (x) => {
            if (x <= 0) throw new Error("Invalid logarithm");
            return Math.log(x);
        },
        abs: Math.abs,
        exp: Math.exp,
        fact: factorial,
        inv: (x) => {
            if (x === 0) throw new Error("Cannot divide by zero");
            return 1 / x;
        }
    };

    const source = input
        .replace(/π/g, "pi")
        .replace(/\b(sin|cos|tan|sqrt|log|ln|abs|exp|fact|inv)\(/gi, "$1(");

    const tokens = tokenize(source);
    let index = 0;

    function peek() {
        return tokens[index];
    }

    function consume() {
        return tokens[index++];
    }

    function primary() {
        const token = consume();

        if (token === "(") {
            const value = addSub();

            if (consume() !== ")") {
                throw new Error("Missing parenthesis");
            }

            return value;
        }

        if (token === "+" || token === "-") {
            const value = primary();
            return token === "-" ? -value : value;
        }

        if (/^\d/.test(token || "") || (token || "").startsWith(".")) {
            const value = Number(token);

            if (!Number.isFinite(value)) {
                throw new Error("Invalid number");
            }

            return value;
        }

        if (/^pi$/i.test(token || "")) return Math.PI;
        if (/^e$/i.test(token || "")) return Math.E;
        if (/^ans$/i.test(token || "")) return state.lastAnswer;

        if (token && /^[a-z]+$/i.test(token)) {
            const fn = functions[token.toLowerCase()];

            if (!fn || consume() !== "(") {
                throw new Error("Invalid function");
            }

            const argument = addSub();

            if (consume() !== ")") {
                throw new Error("Missing parenthesis");
            }

            const value = fn(argument);

            if (!Number.isFinite(value)) {
                throw new Error("Math error");
            }

            return value;
        }

        throw new Error("Invalid expression");
    }

    function postfix() {
        let value = primary();

        while (peek() === "!") {
            consume();
            value = factorial(value);
        }

        return value;
    }

    function power() {
        let value = postfix();

        if (peek() === "^") {
            consume();
            value = Math.pow(value, power());
        }

        return value;
    }

    function multiplyDivide() {
        let value = power();

        while (peek() === "*" || peek() === "/") {
            const operator = consume();
            const right = power();

            if (operator === "/" && right === 0) {
                throw new Error("Cannot divide by zero");
            }

            value = operator === "*" ? value * right : value / right;
        }

        return value;
    }

    function addSub() {
        let value = multiplyDivide();

        while (peek() === "+" || peek() === "-") {
            const operator = consume();
            const right = multiplyDivide();

            value = operator === "+" ? value + right : value - right;
        }

        return value;
    }

    const result = addSub();

    if (index !== tokens.length || !Number.isFinite(result)) {
        throw new Error("Math error");
    }

    return result;
}

function calculateScientific() {
    if (!state.expression || state.hasError) return;

    try {
        const original = state.expression;
        const result = evaluateScientific(original);
        const formatted = formatNumber(result);

        state.history.unshift({
            expression: original,
            result: formatted
        });

        state.history = state.history.slice(0, 100);
        state.lastAnswer = result;
        state.expression = formatted;
        state.result = formatted;
        state.justCalculated = true;
        state.hasError = false;

        updateDisplay();
        renderHistory();

        resultDisplay.classList.remove("is-updated");
        void resultDisplay.offsetWidth;
        resultDisplay.classList.add("is-updated");
    } catch {
        showError("Error");
    }
}

const originalHandleButton = handleButton;

handleButton = function (action, button) {
    const scientificActions = [
        "square", "power", "sqrt", "reciprocal",
        "factorial", "pi", "e", "ans", "sin",
        "cos", "tan", "log", "ln", "degree",
        "angle-mode"
    ];

    if (scientificActions.includes(action)) {
        applyScientific(action);
        return;
    }

    if (action === "clear-history") {
        state.history = [];
        renderHistory();
        return;
    }

    if (action === "close-history") {
        historyPanel.hidden = true;
        return;
    }

    if (action === "memory-clear") {
        state.memory = 0;
        return;
    }

    if (action === "memory-recall") {
        state.expression += formatNumber(state.memory);
        state.result = state.expression;
        updateDisplay();
        return;
    }

    if (action === "memory-add" || action === "memory-subtract") {
        const value = Number(state.result);

        if (Number.isFinite(value)) {
            state.memory += action === "memory-add" ? value : -value;
        }

        return;
    }

    originalHandleButton(action, button);
};

function renderHistory() {
    historyList.replaceChildren();

    state.history.forEach((item) => {
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = "history-item";

        const expression = document.createElement("div");
        expression.className = "history-expression";
        expression.textContent = item.expression;

        const result = document.createElement("div");
        result.className = "history-result";
        result.textContent = item.result;

        entry.append(expression, result);

        entry.addEventListener("click", () => {
            state.expression = item.result;
            state.result = item.result;
            state.hasError = false;
            state.justCalculated = true;

            updateDisplay();
            historyPanel.hidden = true;
        });

        historyList.appendChild(entry);
    });
}

$("#scientific-toggle")?.addEventListener("click", () => {
    state.scientific = !state.scientific;
    scientificPanel.hidden = !state.scientific;
});

$("#history-toggle")?.addEventListener("click", () => {
    historyPanel.hidden = !historyPanel.hidden;
    renderHistory();
});

$("#theme-toggle")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = state.theme;
    document.body.dataset.theme = state.theme;
});

document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key;

    if (/^\d$/.test(key)) {
        appendNumber(key);
    } else if (key === ".") {
        appendDecimal();
    } else if (key === "+") {
        appendOperator("+");
    } else if (key === "-") {
        appendOperator("−");
    } else if (key === "*") {
        appendOperator("×");
    } else if (key === "/") {
        event.preventDefault();
        appendOperator("÷");
    } else if (key === "Enter" || key === "=") {
        calculate();
    } else if (key === "Backspace") {
        backspace();
    } else if (key === "Escape") {
        clearAll();
    } else if (key === "(" || key === ")") {
        appendParenthesis(key);
    }
});

updateAngleButton();
renderHistory();
updateDisplay();
