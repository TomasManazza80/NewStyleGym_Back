const user = require("../models/users/user");
const userService = require("../services/userServices");
const AllValidation = require("../validation/AllValidation");
const { authHash } = require('../services/auth/auth');

const loginUser = async (req, res) => {
  try {
    const userdata = req.body;
    const { value, error } = AllValidation.fatchUser.validate(userdata);
    if (error !== undefined) {
      console.log("error", error);
      res.status(400).send(error.details[0].message);
    } else {
      const response = await userService.login(value);
      if (response === "NOT FOUND!" || response === "Password wrong!") {
        res.status(401).send(response);
      } else {
        res.send(response);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const updateActivity = async (req, res) => {
  try {
    const userId = req.params.id;
    const { actividad } = req.body;
    const response = await userService.updateActivity(userId, actividad);
    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};


const getActivity = async (req, res) => {
  try {
    const userId = req.params.id;
    const response = await userService.getActivity(userId);
    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  } 
}
const activityAsigned = async (req, res) => {
  try {
    const id = req.params.id;
    const { actividad } = req.body; // La actividad viene en el cuerpo de la petición

    const response = await userService.addActivity(actividad, id);
   

    if (!response) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error en activityAsigned:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};



const getId = async (req, res) => {
  try {
    const userEmail = req.params.email;
    const response = await userService.getIdByEmail(userEmail);
   
    
    if (!response) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error en getId:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


const createUser = async (req, res) => {
  try {
    const userdata = req.body;
    const { value, error } = AllValidation.createUser.validate(userdata);
    if (error !== undefined) {
      console.log("error", error);
      res.status(400).send(error.details[0].message);
    } else {
      const user = await userService.createUser(value);
      if (!user) {
        res.sendStatus(401);
      } else {
        res.sendStatus(200);
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const getRole = async (req, res) => {
  try {
    const userEmail = req.params.email;
    const response = await userService.getRoleByEmail(userEmail);
    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};



const updateUser = async (req, res) => {
  try {
    const userdata = req.body;
    const { value, error } = AllValidation.updateUser.validate(userdata);
    if (error !== undefined) {
      console.log("error", error);
      res.status(400).send(error.details[0].message);
    } else {
      // Si hay una contraseña en los datos, primero la hasheamos
      if (value.password) {
        const EncyPass = await authHash({ password: value.password });
        value.password = EncyPass;
      }
      const response = await userService.updateUser({ id: req.params.id, ...value });
      if (!response) {
        res.sendStatus(404); // Usuario no encontrado
      } else {
        res.sendStatus(200); // Usuario actualizado con éxito
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const getAllUsers = async (req, res) => {
  try {
    const response = await userService.getAllUsers();
    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const addmount = async (req, res) => {
  try {
    const { userId, month } = req.body;
    const response = await userService.addmountserveice(userId, month);
    res.send(response);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const getMounts = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await userService.getMounts(userId);
    if (!user) {
      return res.status(404).send("Usuario no encontrado");
    }
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};


const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const result = await userService.deleteUser(userId);
    if (result === 1) {
      res.status(200).send({ message: 'Usuario eliminado correctamente.' });
    } else {
      res.status(404).send({ message: 'Usuario no encontrado.' });
    }
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);
    res.status(500).send('Error interno del servidor al eliminar el usuario.');
  }
};

module.exports = { updateActivity, loginUser,getActivity,activityAsigned,getId,getMounts, createUser, updateUser, deleteUser, getRole, getAllUsers, addmount };