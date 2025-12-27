import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Paper,
  InputBase,
  IconButton,
  List,
  Chip,
  Divider,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Fab,
  Alert,
  alpha,
  Card,
  CardContent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import TimerIcon from "@mui/icons-material/Timer";
import StarIcon from "@mui/icons-material/Star";
import StudentCanteenView from "./StudentCanteenView";

/* ============================================
   🏭 [Factory Pattern]
   ApiFactory centralizes backend endpoints.
   Logs confirm factory method usage.
============================================ */
const ApiFactory = {
  getMenu: () => {
    console.log("🏭 ApiFactory: Returning endpoint for 'getMenu'");
    return "http://localhost:5000/api/authority/canteen-menu";
  },
  getReviews: (itemId) => `http://localhost:5000/api/admin/students/canteen-menu/${itemId}/reviews`,
  addItem: () => {
    console.log("🏭 ApiFactory: Returning endpoint for 'addItem'");
    return "http://localhost:5000/api/authority/canteen-menu";
  },
  deleteItem: (id) => {
    console.log(`🏭 ApiFactory: Returning endpoint for 'deleteItem' with id=${id}`);
    return `http://localhost:5000/api/authority/canteen-menu/${id}`;
  },
  toggleAvailability: (id) => {
    console.log(`🏭 ApiFactory: Returning endpoint for 'toggleAvailability' with id=${id}`);
    return `http://localhost:5000/api/authority/canteen-menu/${id}/availability`;
  },
};


/* ============================================
   🧠 [Strategy Pattern]
   MenuFormatter defines strategies to process API data.
   Easy to plug in different parsing logic later (e.g., currency, rating styles)
============================================ */
/*const MenuFormatter = {
  defaultFormat: (item) => ({
    ...item,
    rating: item.rating ? parseFloat(item.rating) : 0,
    price:
      item.price !== undefined && item.price !== null
        ? parseFloat(item.price)
        : 0,
    reviews: Array.isArray(item.reviews) ? item.reviews : [], // to hold detailed reviews
    // normalize snake_case from backend to camelCase used in UI
    mealType: item.mealType || item.meal_type || "",
    foodType: item.foodType || item.food_type || "",
    preparationTime: item.preparationTime || item.preparation_time || "",
  }),
};*/
const MenuFormatter = {
  defaultFormat: (item) => ({
    ...item,

    rating: item.average_rating ? parseFloat(item.average_rating) : 0,
    price: item.price !== undefined ? parseFloat(item.price) : 0,

    // ⬇️ IMPORTANT
    reviewCount: Number(item.review_count) || 0,
    reviews: [], // details fetched only on click

    mealType: item.mealType || item.meal_type || "",
    foodType: item.foodType || item.food_type || "",
    preparationTime: item.preparationTime || item.preparation_time || "",
  }),
};


/* ============================================
   🧩 [Template Method Pattern]
   Custom Hook that defines common fetch flow (load → format → set).
   Can be reused for other menu-like sections (library, sports, etc.)
============================================ */
const useMenuData = () => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMenu = useCallback(async () => {
    try {
      const response = await fetch(ApiFactory.getMenu());
      const data = await response.json();
      const formatted = data.map(MenuFormatter.defaultFormat);
      setMenu(formatted);
    } catch (err) {
      setError("Failed to fetch menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return { menu, setMenu, loading, error, setError };
};

/* ============================================
   ⚙️ [Command Pattern]
   Each CRUD operation is wrapped in a command object.
   Keeps UI clean and encapsulates request logic.
============================================ */
const MenuCommand = {
  addItem: async (newItem, setMenu, menu, handleCloseDialog, setError) => {
    try {
      const response = await fetch(ApiFactory.addItem(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  ...newItem,
  mealType: newItem.mealType,      // ✅ ADD HERE
  foodType: newItem.foodType,      // ✅ ADD HERE
  price: parseFloat(newItem.price),
  created_by: 1,
}),

      });
      const newItemData = await response.json();
      const formatted = MenuFormatter.defaultFormat(newItemData);
      setMenu([formatted, ...menu]);
      handleCloseDialog();
    } catch (err) {
      setError("Failed to add item");
    }
  },

  deleteItem: async (item, menu, setMenu, setError) => {
    try {
      await fetch(ApiFactory.deleteItem(item.item_id), {
        method: "DELETE",
      });
      setMenu(menu.filter((m) => m.item_id !== item.item_id));
    } catch (err) {
      setError("Failed to delete item");
    }
  },

  updateItem: async (item, updatedData, menu, setMenu, handleCloseDialog, setError) => {
  try {
    const response = await fetch(`http://localhost:5000/api/authority/canteen-menu/${item.item_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  ...updatedData,
  mealType: updatedData.mealType,   // ✅ ADD HERE
  foodType: updatedData.foodType,   // ✅ ADD HERE
  price: parseFloat(updatedData.price),
}),

    });
    const updated = await response.json();
    setMenu(menu.map((m) => (m.item_id === updated.item_id ? updated : m)));
    handleCloseDialog();
  } catch (err) {
    setError("Failed to update item");
  }
},


  toggleAvailability: async (item, menu, setMenu, setError) => {
    try {
      const response = await fetch(ApiFactory.toggleAvailability(item.item_id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available }),
      });
      const updated = await response.json();
      setMenu(
        menu.map((m) => (m.item_id === updated.item_id ? updated : m))
      );
    } catch (err) {
      setError("Failed to update availability");
    }
  },
};

const useReviews = (itemId) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    if (!itemId) return;
    try {
      const res = await fetch(ApiFactory.getReviews(itemId));
      const data = await res.json();
      setReviews(data); // backend returns an array of reviews
    } catch (err) {
      setError("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { reviews, loading, error, fetchReviews };
};

/* ============================================
   🎨 Component: CanteenSection
============================================ */
const CanteenSection = ({ user }) => {
  const theme = useTheme();
  const { menu, setMenu, loading, error, setError } = useMenuData();
  const [searchQuery, setSearchQuery] = useState("");
  const [mealFilter, setMealFilter] = useState("");
  const [foodFilter, setFoodFilter] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItem, setNewItem] = useState({
  name: "",
  description: "",
  price: "",
  mealType: "",      // NEW
  foodType: "",      // NEW
  available: true,
  preparationTime: "",
});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
const [currentItemReviews, setCurrentItemReviews] = useState([]);
const [currentItemName, setCurrentItemName] = useState("");


  

  const userRole = user?.role || "student";

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setNewItem({
  name: item.name,
  description: item.description,
  price: item.price.toString(),
  mealType: item.mealType,      // NEW
  foodType: item.foodType,      // NEW
  available: item.available,
  preparationTime: item.preparation_time,
});

    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setNewItem({
      name: "",
      description: "",
      price: "",
      category: "",
      available: true,
      preparationTime: "",
    });
  };

  const handleViewReviews = async (item) => {
  try {
    const res = await fetch(ApiFactory.getReviews(item.item_id));
    const data = await res.json();

    setCurrentItemReviews(data); // reviews for the clicked item
    setCurrentItemName(item.name); // item name for dialog title
    setReviewDialogOpen(true); // open the dialog

    // Also update the menu state if you want to store reviews globally
    setMenu((prevMenu) =>
  prevMenu.map((m) =>
    m.item_id === item.item_id
      ? { ...m, reviews: data, reviewCount: data.length }
      : m
  )
);

  } catch (err) {
    setError("Failed to load reviews");
  }
};



  const filteredMenu = menu.filter((item) => {
    
  const matchesSearch =
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesMeal =
    mealFilter === "" || ((item.mealType || "").toString().toLowerCase() === mealFilter.toString().toLowerCase());

  const matchesFood =
    foodFilter === "" || ((item.foodType || "").toString().toLowerCase() === foodFilter.toString().toLowerCase());

  return matchesSearch && matchesMeal && matchesFood;
});


  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );

  /* ============================================
     👥 [Observer Pattern]
     React reactivity automatically updates UI when menu state changes.
  ============================================ */
  return (
    <>
      {userRole === "authority" ? (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box
              sx={{
                bgcolor: "white",
                color: "primary.main",
                p: 4,
                borderRadius: 2,
                mb: 4,
                position: "relative",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="h4" gutterBottom>
                    Canteen Menu
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Manage today's menu
                  </Typography>
                </Box>
                <Fab
                  color="secondary"
                  aria-label="add"
                  onClick={() => setOpenDialog(true)}
                  size="medium"
                >
                  <AddIcon />
                </Fab>
              </Box>
            </Box>

            {/* Search */}
            <Paper
              sx={{
                p: "2px 4px",
                display: "flex",
                alignItems: "center",
                mb: 4,
                bgcolor: "white",
              }}
            >
              <IconButton sx={{ p: "10px" }}>
                <SearchIcon />
              </IconButton>
              <InputBase
                sx={{ ml: 1, flex: 1 }}
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Paper>
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
  <TextField
    select
    label="Filter by Meal Type"
    value={mealFilter}
    onChange={(e) => setMealFilter(e.target.value)}
    sx={{ width: 200 }}
    SelectProps={{ native: true }}
  >
    <option value="">All</option>
    <option value="Breakfast">Breakfast</option>
    <option value="Lunch">Lunch</option>
    <option value="Dinner">Dinner</option>
  </TextField>

  <TextField
    select
    label="Filter by Food Type"
    value={foodFilter}
    onChange={(e) => setFoodFilter(e.target.value)}
    sx={{ width: 200 }}
    SelectProps={{ native: true }}
  >
    <option value="">All</option>
    <option value="Main Course">Main Course</option>
    <option value="Dessert">Dessert</option>
    <option value="Snacks">Snacks</option>
    <option value="Curry">Curry</option>
  </TextField>
</Box>

            {/* Menu List */}
            <List>
              {filteredMenu.map((item) => (
                <Card
                  key={item.item_id}
                  sx={{
                    mb: 2,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: theme.shadows[4],
                    },
                    opacity: item.available ? 1 : 0.7,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {item.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          paragraph
                        >
                          {item.description}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                          <Chip
                            icon={<AttachMoneyIcon />}
                            label={`৳${item.price}`}
                            color="primary"
                            size="small"
                            
                          />
                          <Chip
                            icon={<TimerIcon />}
                            label={item.preparationTime}
                            color="info"
                            size="small"
                          />
                          <Chip
                            label={item.category}
                            color="secondary"
                            size="small"
                          />
                          <Chip
                            icon={<StarIcon />}
                            label={(typeof item.rating === "number" ? item.rating : 0).toFixed(1)}
                            color="warning"
                            size="small"
                          />
                          <Chip label={item.mealType} color="success" size="small" />
<Chip label={item.foodType} color="info" size="small" />

                          {!item.available && (
                            <Chip
                              label="Not Available"
                              color="error"
                              size="small"
                            />
                          )}
                        </Box>
                      </Box>
                      <Button
  size="small"
  variant="outlined"
  onClick={() => handleViewReviews(item)}
>
  View Reviews ({item.reviewCount})

</Button>





                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditItem(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() =>
                            MenuCommand.deleteItem(
                              item,
                              menu,
                              setMenu,
                              setError
                            )
                          }
                        >
                          Delete
                        </Button>
                        <Button
                          size="small"
                          variant={
                            item.available ? "outlined" : "contained"
                          }
                          color={item.available ? "error" : "success"}
                          onClick={() =>
                            MenuCommand.toggleAvailability(
                              item,
                              menu,
                              setMenu,
                              setError
                            )
                          }
                        >
                          {item.available
                            ? "Mark Unavailable"
                            : "Mark Available"}
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </List>
            <Dialog
  open={reviewDialogOpen}
  onClose={() => setReviewDialogOpen(false)}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle>Reviews for {currentItemName}</DialogTitle>
  <DialogContent dividers>
    {currentItemReviews.length === 0 ? (
      <Typography>No reviews yet.</Typography>
    ) : (
      currentItemReviews.map((rev) => (
        <Box key={rev.review_id} sx={{ mb: 2 }}>
          <Typography variant="subtitle2">{rev.user_name}</Typography>
          <Typography variant="body2">Rating: {rev.rating}</Typography>
          <Typography variant="body2">{rev.comment}</Typography>
          <Divider sx={{ my: 1 }} />
        </Box>
      ))
    )}
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setReviewDialogOpen(false)}>Close</Button>
  </DialogActions>
</Dialog>

            {/* Add/Edit Dialog */}
            <Dialog
              open={openDialog}
              onClose={handleCloseDialog}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>
                {selectedItem ? "Edit Menu Item" : "Add New Menu Item"}
              </DialogTitle>
              <DialogContent>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    pt: 2,
                  }}
                >
                  <TextField
                    label="Item Name"
                    fullWidth
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                  />
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={2}
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                  />
                  <TextField
                    label="Price (৳)"
                    fullWidth
                    type="number"
                    value={newItem.price}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price: e.target.value })
                    }
                  />
                  <TextField
                    label="Category"
                    fullWidth
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                  />
                  <TextField
                    label="Preparation Time"
                    fullWidth
                    value={newItem.preparationTime}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        preparationTime: e.target.value,
                      })
                    }
                    placeholder="e.g., 15-20 mins"
                  />
                  <TextField
  select
  label="Meal Type"
  fullWidth
  value={newItem.mealType}
  onChange={(e) =>
    setNewItem({ ...newItem, mealType: e.target.value })
  }
  SelectProps={{ native: true }}
>
  <option value="">Select Meal Type</option>
  <option value="Breakfast">Breakfast</option>
  <option value="Lunch">Lunch</option>
  <option value="Dinner">Dinner</option>
</TextField>
                  <TextField
  select
  label="Food Type"
  fullWidth
  value={newItem.foodType}
  onChange={(e) =>
    setNewItem({ ...newItem, foodType: e.target.value })
  }
  SelectProps={{ native: true }}
>
  <option value="">Select Food Type</option>
  <option value="Main Course">Main Course</option>
  <option value="Dessert">Dessert</option>
  <option value="Snacks">Snacks</option>
  <option value="Curry">Curry</option>
</TextField>

                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog}>Cancel</Button>
                <Button
  onClick={() => {
    if (selectedItem) {
      MenuCommand.updateItem(
        selectedItem,
        newItem,
        menu,
        setMenu,
        handleCloseDialog,
        setError
      );
    } else {
      MenuCommand.addItem(
        newItem,
        setMenu,
        menu,
        handleCloseDialog,
        setError
      );
    }
  }}
  variant="contained"
  disabled={!newItem.name || !newItem.price || !newItem.category}
>
  {selectedItem ? "Save Changes" : "Add Item"}
</Button>

              </DialogActions>
            </Dialog>
          </Container>
        </Box>
      ) : (
        <StudentCanteenView user={user} />
      )}
    </>
  );
};

export default CanteenSection;
