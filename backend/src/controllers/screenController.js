const screenService = require("../services/screenService");
const wrapAsync = require("../utils/wrapAsync");


exports.createScreen = wrapAsync(async (req, res, next) => {
    const screen = await screenService.createScreen(req.body);
    res.status(201).json({
        success: true,
        message: "Screen created successfully with seats auto generated",
        data: screen
    });
});

exports.getScreens = wrapAsync(async (req, res, next) => {
    const screens = await screenService.getScreens();
    res.status(200).json({
        success: true,
        message: "Screens fetched successfully",
        data: screens
    });
});
