import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  IconButton,
  InputBase,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Tabs,
  Tab,
  Rating,
  CardActions,
  Badge,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon,
  AttachMoney as AttachMoneyIcon,
  Timer as TimerIcon,
  Notifications as NotificationsIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  RateReview as RateReviewIcon
} from '@mui/icons-material';

/*const StudentCanteenView = ({ user }) => {
  const [menu, setMenu] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState("");
  const [selectedFoodType, setSelectedFoodType] = useState("");

  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });

  const theme = useTheme();

//const [reviews, setReviews] = useState({}); // Already initialized as empty object

useEffect(() => {
  fetchMenu();
}, []);

const fetchMenu = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/authority/canteen-menu");

    const data = await response.json();
    // Group by meal_type (Breakfast, Lunch, Dinner, etc.)
setMenu(data);


    
    // Initialize reviews object for all items
    const reviewsObj = {};
    data.forEach(item => {
      reviewsObj[item.item_id] = []; // Initialize as empty array
      fetchReviews(item.item_id);
    });
    setReviews(reviewsObj);
  } catch (err) {
    console.error('Failed to fetch menu:', err);
  } finally {
    setLoading(false);
  }
};

const fetchReviews = async (itemId) => {
  try {
    // Use student routes path where reviews are defined
    const response = await fetch(
      `http://localhost:5000/api/admin/students/canteen-menu/${itemId}/reviews`
    );
    const data = await response.json();
    setReviews(prev => ({
      ...prev,
      [itemId]: data || [] // Ensure it's always an array
    }));
  } catch (err) {
    console.error('Failed to fetch reviews:', err);
    setReviews(prev => ({
      ...prev,
      [itemId]: [] // Set empty array on error
    }));
  }
};

  const handleAddReview = async () => {
  if (!newReview.rating) return;
  console.log("🟢 Submitting review for item:", selectedItem);

  try {
    const response = await fetch(
      `http://localhost:5000/api/admin/students/canteen-menu/${selectedItem.item_id}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          all_student_id: user?.all_student_id || user?.user?.all_student_id || JSON.parse(localStorage.getItem('user') || '{}')?.all_student_id,
          student_name: user?.name || user?.user?.name || JSON.parse(localStorage.getItem('user') || '{}')?.name,
          roll_no: user?.roll_no || user?.user?.roll_no || JSON.parse(localStorage.getItem('user') || '{}')?.roll_no,
          user_id: user?.user_id || user?.user?.user_id || JSON.parse(localStorage.getItem('user') || '{}')?.user_id,
          rating: newReview.rating,
          comment: newReview.comment,
        }),
      }
    );

    console.log("🟡 Response status:", response.status);

    // If response not ok, try to read error body safely and show a helpful message
    if (!response.ok) {
      let errText = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        // Prefer common fields, but if details exist, prefer deeper message
        if (errBody.details) {
          const d = errBody.details;
          errText = errBody.error || d.message || d.detail || d.code || JSON.stringify(d) || errText;
        } else {
          errText = errBody.error || errBody.message || JSON.stringify(errBody) || errText;
        }
      } catch (e) {
        // If JSON parse fails, fall back to statusText
        errText = response.statusText || errText;
      }
      alert(`❌ Failed: ${errText}`);
      return;
    }

    // Successful response — parse JSON and update reviews
    let review;
    try {
      review = await response.json();
    } catch (e) {
      console.error('Failed to parse created review JSON:', e);
      alert('✅ Review submitted but server returned unexpected response. Please refresh to see it.');
      setOpenReviewDialog(false);
      setNewReview({ rating: 5, comment: "" });
      return;
    }

    setReviews((prev) => ({
      ...prev,
      [selectedItem.item_id]: [review, ...(prev[selectedItem.item_id] || [])],
    }));

    setOpenReviewDialog(false);
    setNewReview({ rating: 5, comment: "" });
    alert("✅ Review submitted successfully!");
  } catch (err) {
    console.error("🔥 Failed to add review:", err);
    alert("Network error!");
  }
};


const handleDeleteReview = async (reviewId, itemId) => {
  try {
    await fetch(
      `http://localhost:5000/api/canteen-menu/reviews/${reviewId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all_student_id: user.all_student_id })
      }
    );
    
    setReviews(prev => ({
      ...prev,
      [itemId]: prev[itemId].filter(r => r.review_id !== reviewId)
    }));
  } catch (err) {
    console.error('Failed to delete review:', err);
  }
};*/
/* -----------------------------------------------------
   🧱 Facade Pattern — Canteen API Facade
   ------------------------------------------------------
   Provides a unified interface for all canteen-related
   API calls so UI components remain clean and focused.
------------------------------------------------------ */
const CanteenAPI = {
  async fetchMenu() {
    const res = await fetch("http://localhost:5000/api/authority/canteen-menu");
    if (!res.ok) throw new Error("Failed to fetch menu");
    return res.json();
  },

  async fetchReviews(itemId) {
    const res = await fetch(
      `http://localhost:5000/api/admin/students/canteen-menu/${itemId}/reviews`
    );
    if (!res.ok) throw new Error("Failed to fetch reviews");
    return res.json();
  },

  async addReview(itemId, payload) {
    const res = await fetch(
      `http://localhost:5000/api/admin/students/canteen-menu/${itemId}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to add review");
    }
    return res.json();
  },

  async deleteReview(reviewId, all_student_id) {
    const res = await fetch(
      `http://localhost:5000/api/canteen-menu/reviews/${reviewId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all_student_id }),
      }
    );

    if (!res.ok) throw new Error("Failed to delete review");
    return res.json();
  },
};

/* -----------------------------------------------------
   🏭 Factory Pattern — User Context Resolver
   ------------------------------------------------------
   Ensures user identity is consistently resolved from
   props or localStorage without duplication.
------------------------------------------------------ */
const UserFactory = {
  resolve(user) {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      all_student_id:
        user?.all_student_id ||
        user?.user?.all_student_id ||
        stored.all_student_id,
      name: user?.name || user?.user?.name || stored.name,
      roll_no: user?.roll_no || user?.user?.roll_no || stored.roll_no,
      user_id: user?.user_id || user?.user?.user_id || stored.user_id,
    };
  },
};

/* -----------------------------------------------------
   🔁 Observer Pattern — React State Updates
   ------------------------------------------------------
   React's state system automatically propagates changes
   to UI when menu or reviews update.
------------------------------------------------------ */
const StudentCanteenView = ({ user }) => {
  const [menu, setMenu] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  /* -----------------------------------------------------
   🎯 UI Filter State — (kept for existing JSX)
------------------------------------------------------ */
const [selectedMealType, setSelectedMealType] = useState("");
const [selectedFoodType, setSelectedFoodType] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);

  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

  const theme = useTheme();

  useEffect(() => {
    loadMenu();
  }, []);

  /* -----------------------------------------------------
     🧠 Command Pattern — Menu Loading Action
  ------------------------------------------------------ */
  const loadMenu = async () => {
    try {
      const data = await CanteenAPI.fetchMenu();
      setMenu(data);

      const reviewMap = {};
      for (const item of data) {
        reviewMap[item.item_id] = [];
        loadReviews(item.item_id);
      }
      setReviews(reviewMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (itemId) => {
    try {
      const data = await CanteenAPI.fetchReviews(itemId);
      setReviews((prev) => ({ ...prev, [itemId]: data || [] }));
    } catch {
      setReviews((prev) => ({ ...prev, [itemId]: [] }));
    }
  };

  /* -----------------------------------------------------
     🧠 Command Pattern — Add Review Action
  ------------------------------------------------------ */
  const handleAddReview = async () => {
    if (!selectedItem) return;

    const userCtx = UserFactory.resolve(user);

    try {
      const review = await CanteenAPI.addReview(selectedItem.item_id, {
        ...userCtx,
        rating: newReview.rating,
        comment: newReview.comment,
      });

      setReviews((prev) => ({
        ...prev,
        [selectedItem.item_id]: [
          review,
          ...(prev[selectedItem.item_id] || []),
        ],
      }));

      setOpenReviewDialog(false);
      setNewReview({ rating: 5, comment: "" });
      alert("✅ Review submitted successfully!");
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  /* -----------------------------------------------------
     🧠 Command Pattern — Delete Review Action
  ------------------------------------------------------ */
  const handleDeleteReview = async (reviewId, itemId) => {
    const userCtx = UserFactory.resolve(user);

    try {
      await CanteenAPI.deleteReview(reviewId, userCtx.all_student_id);
      setReviews((prev) => ({
        ...prev,
        [itemId]: prev[itemId].filter((r) => r.review_id !== reviewId),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  

  return (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    {/* Header */}
    <Box
      sx={{
        bgcolor: 'white',
        color: theme.palette.primary.main,
        p: 4,
        borderRadius: 2,
        mb: 4,
        position: 'relative',
        boxShadow: 3,
      }}
    >
      <Typography variant="h4" gutterBottom>
        Canteen
      </Typography>
      <Typography variant="h6" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
        Check today's canteen menu and reviews.
      </Typography>
    </Box>
      {/* ======= Dark Blue Half + Circles ======= */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "50%",
                //bgcolor: "#0B3D91",
                zIndex: 0,
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.1)",
                  top: "20%",
                  left: "30%",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  width: 250,
                  height: 250,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.15)",
                  top: "25%",
                  left: "40%",
                }}
              />
            </Box>
    <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
  
  {/* Meal Type Filter */}
  <TextField
    select
    label="Meal Type"
    value={selectedMealType}
    onChange={(e) => setSelectedMealType(e.target.value)}
    sx={{ minWidth: 150 }}
  >
    <MenuItem value="">All</MenuItem>
    <MenuItem value="Breakfast">Breakfast</MenuItem>
    <MenuItem value="Lunch">Lunch</MenuItem>
    <MenuItem value="Dinner">Dinner</MenuItem>
  </TextField>

  {/* Food Type Filter */}
  <TextField
    select
    label="Food Type"
    value={selectedFoodType}
    onChange={(e) => setSelectedFoodType(e.target.value)}
    sx={{ minWidth: 150 }}
  >
    <MenuItem value="">All</MenuItem>
    <MenuItem value="Main Course">Main Course</MenuItem>
    <MenuItem value="Curry">Curry</MenuItem>
    <MenuItem value="Snacks">Snacks</MenuItem>
    <MenuItem value="Desert">Desert</MenuItem>
  </TextField>

</Box>

    <Grid container spacing={2}>
      {menu
  .filter(item => item.available)
  .filter(item => !selectedMealType || item.meal_type === selectedMealType)
  .filter(item => !selectedFoodType || item.food_type === selectedFoodType)
  .map(item => (

        <Grid item xs={12} sm={6} md={4} key={item.item_id}>
          <Card>
            <CardContent>
              <Typography variant="h6">{item.name}</Typography>
              <Typography variant="body2" color="textSecondary">{item.description}</Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>৳{item.price}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Rating value={parseFloat(item.average_rating)} readOnly size="small" />
                <Typography variant="caption" sx={{ ml: 1 }}>
                  ({item.review_count} reviews)
                </Typography>
              </Box>
            </CardContent>
            
            <CardActions>
              <Button
                size="small"
                onClick={() => {
                  setSelectedItem(item);
                  setOpenReviewDialog(true);
                }}
              >
                Leave Review
              </Button>
              <Button 
                size="small"
                onClick={() => setSelectedItem(item)}
              >
                View Reviews
              </Button>
            </CardActions>

            {/* Reviews Section - ADD HERE */}
            {selectedItem?.item_id === item.item_id && (
              <CardContent sx={{ borderTop: '1px solid #eee', pt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Reviews:</Typography>
                {reviews[item.item_id] && reviews[item.item_id].length > 0 ? (
                  reviews[item.item_id].map(review => (
                    <Box key={review.review_id} sx={{ mt: 2, p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2"><strong>{review.student_name}</strong></Typography>
                        <Rating value={review.rating} readOnly size="small" />
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1 }}>{review.comment}</Typography>
                      {user.all_student_id === review.all_student_id && (
         
                        <Button 
                          size="small" 
                          color="error" 
                          sx={{ mt: 1 }}
                          onClick={() => handleDeleteReview(review.review_id, item.item_id)}
                        >
                          Delete
                        </Button>
                      )}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'textSecondary' }}>
                    No reviews yet
                  </Typography>
                )}
              </CardContent>
            )}
          </Card>
        </Grid>
      ))}
    </Grid>

    {/* Review Dialog */}
    <Dialog open={openReviewDialog} onClose={() => setOpenReviewDialog(false)}>
      <DialogTitle>Review: {selectedItem?.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography component="legend">Rating</Typography>
          <Rating
            value={newReview.rating}
            onChange={(e, val) => setNewReview({ ...newReview, rating: val })}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comment"
            value={newReview.comment}
            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
            sx={{ mt: 2 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenReviewDialog(false)}>Cancel</Button>
        <Button onClick={handleAddReview} variant="contained">Submit Review</Button>
      </DialogActions>
    </Dialog>
  </Container>
);
};

export default StudentCanteenView;