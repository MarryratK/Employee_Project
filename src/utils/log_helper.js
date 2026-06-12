const fs = require("fs/promises");
const path = require("path");

const logError = async (res, error, controller) => {
    try {
        const now = new Date();

        const timestamp = now.toISOString().replace("T", " ").substring(0, 19);
        const date = now.toISOString().split("T")[0];

        const folderPath = path.join(__dirname, "../../logs");
        const filename = `${controller}_${date}.txt`;
        const filePath = path.join(folderPath, filename);

        await fs.mkdir(folderPath, { recursive: true });

        const logMessage = `
[${timestamp}]
Controller: ${controller}
Message: ${error.message}
Stack: ${error.stack}
-------------------------------
`;

        await fs.appendFile(filePath, logMessage);

    } catch (err) {
        console.error("Error writing log file:", err);
    }

    return res.status(500).json({
        message: "Internal Server Error",
        isSuccess: false
    });
};

module.exports = logError;