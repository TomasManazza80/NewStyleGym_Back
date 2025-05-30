const { where } = require("sequelize");
const { model, Sequelize } = require("../models/index");
const { authHash, createToken, compareHash } = require("./auth/auth");

const login = async (value) => {
  try {
    const user = await model.user.findOne({
      where: {
        email: value.email,
      },
    });

    if (!user) {
      console.log(error);
      return "NOT FOUND!";
    } else {
      const isPasswordValid = await compareHash({
        userPass: value.password,
        dbPass: user.password,
      });

      if (isPasswordValid) {
        const RetriveUpdate = {
          email: user.email,
          password: user.password,
        };
        const token = await createToken(RetriveUpdate);
        return { token, email: user.email };
      } else {
        return "Password wrong!";
      }
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getActivity = async (userId) => {
  try {
    const user = await model.user.findByPk(userId, {
      attributes: ["actividad"],
    });
    if (!user) {
      return null;
    }
    return user.actividad;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

const updateActivity = async (userId, actividad) => {
  try {
    const user = await model.user.findByPk(userId);
    if (!user) {
      return null;
    }

    await user.update({ actividad: actividad });
    return user;
  }
  catch (error) {
    console.log(error);
    throw error;
  }
};

const addActivity = async (actividad, id) => {
  try {
    const user = await model.user.findByPk(id);
    if (!user) {
      return null;
    }
    
    await user.update({ actividad: actividad });
    return user;
  } catch (error) {
    console.error("Error adding activity:", error);
    throw error;
  }
};

const addmountserveice = async (userId, month) => {
  try {
    const user = await model.user.findByPk(userId);
    if (!user) {
      return null;
    }
    
    // Obtener los meses actuales y agregar el nuevo
    const mesesActuales = user.meses || [];
    if (!mesesActuales.includes(month)) {
      const updatedUser = await user.update({
        meses: [...mesesActuales, month]
      });
      return updatedUser;
    }
    
    return user;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getIdByEmail = async (userEmail) => {
  try {
    const user = await model.user.findOne({ where: { email: userEmail } });
    if (!user) {
      return null;
    }
    return user.id;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const getMounts = async (userId) => {
  try {
    const user = await model.user.findByPk(userId, {
      attributes: ['id', 'name', 'meses']
    });
    
    if (!user) {
      return null;
    }
    
    return {
      id: user.id,
      name: user.name,
      meses: user.meses || []
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};


const createUser = async (data) => {
  try {
    const EncyPass = await authHash(data);
    const userData = { ...data, password: EncyPass };
    const FinalData = await model.user.create(userData);
    return FinalData;
  } catch (error) {
    console.log(error);
    throw error;
  }
};


const getRoleByEmail = async (userEmail) => {

  try {
    const user = await model.user.findOne({ where: { email: userEmail } });

    if (!user) {

      return { error: 'User not found', statusCode: 404 };
    }
    return { role: user.role, statusCode: 200 };
  } catch (error) {
 
    return { error: 'Internal Server Error', statusCode: 500 };
  }
};


const getAllUsers = async () => {
  try {
    const users = await model.user.findAll();
    return users;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const updateUser = async (data) => {
  try {
    const user = await model.user.findByPk(data.id);
    if (!user) {
      return null; // Usuario no encontrado
    }
    await user.update(data);
    return user;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    const result = await model.user.destroy({
      where: {
        id: userId,
      },
    });
    return result; // Retorna 1 si se eliminó, 0 si no se encontró
  } catch (error) {
   
    throw error;
  }
};

module.exports = { updateActivity ,login, getActivity,addActivity, getIdByEmail, getMounts, createUser, updateUser, deleteUser, getRoleByEmail, getAllUsers, addmountserveice };