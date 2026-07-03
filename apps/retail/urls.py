from rest_framework.routers import DefaultRouter
from .views import ExpenseViewSet, ProductCategoryViewSet, ProductViewSet, StockOrderViewSet

router = DefaultRouter()
router.register("categories", ProductCategoryViewSet, basename="retail-category")
router.register("products", ProductViewSet, basename="retail-product")
router.register("expenses", ExpenseViewSet, basename="retail-expense")
router.register("orders", StockOrderViewSet, basename="retail-order")

urlpatterns = router.urls
