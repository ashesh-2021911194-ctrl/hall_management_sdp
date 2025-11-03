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

const StudentCanteenView = ({ user }) => {
  const [menu, setMenu] = useState([]);
  const [reviews, setReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });

//const [reviews, setReviews] = useState({}); // Already initialized as empty object

useEffect(() => {
  fetchMenu();
}, []);

const fetchMenu = async () => {
  try {
    const response = await fetch("http://localhost:5000/api/authority/canteen-menu");

    const data = await response.json();
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
    const review = await response.json();
    console.log("🟣 Review response:", review);

    if (!response.ok) {
      alert(`❌ Failed: ${review.error || "Unknown error"}`);
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
};

  return (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Typography variant="h4" gutterBottom>Canteen Menu</Typography>
    
    <Grid container spacing={2}>
      {menu.filter(item => item.available).map(item => (
        <Grid item xs={12} sm={6} md={4} key={item.item_id}>
          <Card>
            <CardContent>
              <Typography variant="h6">{item.name}</Typography>
              <Typography variant="body2" color="textSecondary">{item.description}</Typography>
              <Typography variant="h5" sx={{ mt: 1 }}>₹{item.price}</Typography>
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