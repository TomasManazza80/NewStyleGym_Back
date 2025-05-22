var express = require("express");
var router = express.Router();
const { createUser, loginUser, getRole, getId ,getActivity,activityAsigned, getMounts, updateUser, addmount, getAllUsers } = require("../controller/userController");


router.post("/createuser", createUser);
router.get("/getAllUsers", getAllUsers);
router.get("/getMounts/:id", getMounts); // Modificado para incluir el ID del usuario
router.get("/getActivity/:id", getActivity);

router.post("/activityAsigned/:id", activityAsigned)
router.get("/getId/:email", getId);
router.post("/login", loginUser);
router.post("/addMount", addmount);
router.get('/role/:email', getRole);
router.put("/updateuser/:id", updateUser);


module.exports = router;