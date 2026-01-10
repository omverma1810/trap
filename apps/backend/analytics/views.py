"""
Analytics app views for dashboard and reports.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, F
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import timedelta

from products.models import Product, Brand, Category
from inventory.models import Inventory, StockMovement
from invoices.models import Invoice, InvoiceItem


class DashboardView(APIView):
    """Dashboard summary view."""
    
    def get(self, request):
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        
        # Product stats
        total_products = Product.objects.filter(status='active').count()
        low_stock_count = Inventory.objects.filter(
            quantity__lte=F('reorder_level'),
            quantity__gt=0
        ).count()
        out_of_stock_count = Inventory.objects.filter(quantity=0).count()
        
        # Invoice stats - today
        today_invoices = Invoice.objects.filter(
            created_at__date=today,
            status__in=['paid', 'partially_paid']
        )
        today_revenue = today_invoices.aggregate(
            total=Sum('total')
        )['total'] or 0
        today_orders = today_invoices.count()
        
        # Invoice stats - this month
        month_invoices = Invoice.objects.filter(
            created_at__date__gte=start_of_month,
            status__in=['paid', 'partially_paid']
        )
        month_revenue = month_invoices.aggregate(
            total=Sum('total')
        )['total'] or 0
        month_orders = month_invoices.count()
        
        # Calculate profit
        month_items = InvoiceItem.objects.filter(
            invoice__in=month_invoices
        )
        month_profit = sum(item.profit for item in month_items)
        
        # Inventory value
        inventory_value = Inventory.objects.aggregate(
            total=Sum(F('quantity') * F('product__cost_price'))
        )['total'] or 0
        
        retail_value = Inventory.objects.aggregate(
            total=Sum(F('quantity') * F('product__selling_price'))
        )['total'] or 0
        
        return Response({
            'products': {
                'total': total_products,
                'low_stock': low_stock_count,
                'out_of_stock': out_of_stock_count,
            },
            'today': {
                'revenue': float(today_revenue),
                'orders': today_orders,
            },
            'month': {
                'revenue': float(month_revenue),
                'orders': month_orders,
                'profit': float(month_profit),
            },
            'inventory': {
                'cost_value': float(inventory_value),
                'retail_value': float(retail_value),
            },
        })


class SalesAnalyticsView(APIView):
    """Sales analytics view."""
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        # Daily sales
        daily_sales = Invoice.objects.filter(
            created_at__date__gte=start_date,
            status__in=['paid', 'partially_paid']
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            revenue=Sum('total'),
            orders=Count('id'),
        ).order_by('date')
        
        # Top products
        top_products = InvoiceItem.objects.filter(
            invoice__created_at__date__gte=start_date,
            invoice__status__in=['paid', 'partially_paid']
        ).values(
            'product__name', 'product__sku'
        ).annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum('total'),
        ).order_by('-revenue')[:10]
        
        # Top categories
        top_categories = InvoiceItem.objects.filter(
            invoice__created_at__date__gte=start_date,
            invoice__status__in=['paid', 'partially_paid']
        ).values(
            'product__category__name'
        ).annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum('total'),
        ).order_by('-revenue')[:5]
        
        # Top brands
        top_brands = InvoiceItem.objects.filter(
            invoice__created_at__date__gte=start_date,
            invoice__status__in=['paid', 'partially_paid']
        ).values(
            'product__brand__name'
        ).annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum('total'),
        ).order_by('-revenue')[:5]
        
        return Response({
            'daily_sales': list(daily_sales),
            'top_products': list(top_products),
            'top_categories': list(top_categories),
            'top_brands': list(top_brands),
        })


class InventoryAnalyticsView(APIView):
    """Inventory analytics view."""
    
    def get(self, request):
        # Stock by category
        stock_by_category = Inventory.objects.values(
            category=F('product__category__name')
        ).annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('product__cost_price')),
        ).order_by('-total_value')
        
        # Stock by brand
        stock_by_brand = Inventory.objects.values(
            brand=F('product__brand__name')
        ).annotate(
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('product__cost_price')),
        ).order_by('-total_value')
        
        # Recent stock movements
        recent_movements = StockMovement.objects.select_related(
            'product', 'created_by'
        ).order_by('-created_at')[:20]
        
        from inventory.serializers import StockMovementSerializer
        
        # Stock status distribution
        in_stock = Inventory.objects.filter(
            quantity__gt=F('reorder_level')
        ).count()
        low_stock = Inventory.objects.filter(
            quantity__lte=F('reorder_level'),
            quantity__gt=0
        ).count()
        out_of_stock = Inventory.objects.filter(quantity=0).count()
        
        return Response({
            'stock_by_category': list(stock_by_category),
            'stock_by_brand': list(stock_by_brand),
            'recent_movements': StockMovementSerializer(recent_movements, many=True).data,
            'stock_status': {
                'in_stock': in_stock,
                'low_stock': low_stock,
                'out_of_stock': out_of_stock,
            },
        })


class ProfitAnalyticsView(APIView):
    """Profit analytics view."""
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        invoices = Invoice.objects.filter(
            created_at__date__gte=start_date,
            status__in=['paid', 'partially_paid']
        )
        
        # Daily profit
        daily_data = []
        for invoice in invoices:
            items = invoice.items.all()
            profit = sum(item.profit for item in items)
            daily_data.append({
                'date': invoice.created_at.date(),
                'revenue': float(invoice.total),
                'cost': float(sum(item.cost_price * item.quantity for item in items)),
                'profit': float(profit),
            })
        
        # Aggregate by date
        from collections import defaultdict
        aggregated = defaultdict(lambda: {'revenue': 0, 'cost': 0, 'profit': 0})
        for item in daily_data:
            date_str = item['date'].isoformat()
            aggregated[date_str]['revenue'] += item['revenue']
            aggregated[date_str]['cost'] += item['cost']
            aggregated[date_str]['profit'] += item['profit']
        
        daily_profit = [
            {'date': date, **values}
            for date, values in sorted(aggregated.items())
        ]
        
        # Total summary
        total_revenue = sum(d['revenue'] for d in daily_profit)
        total_cost = sum(d['cost'] for d in daily_profit)
        total_profit = sum(d['profit'] for d in daily_profit)
        
        return Response({
            'daily_profit': daily_profit,
            'summary': {
                'total_revenue': total_revenue,
                'total_cost': total_cost,
                'total_profit': total_profit,
                'profit_margin': (total_profit / total_revenue * 100) if total_revenue > 0 else 0,
            },
        })
