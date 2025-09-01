from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from .models import User
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

@csrf_exempt
@require_http_methods(["POST"])
def register_view(request):
    try:
        # Parse JSON data
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        confirmation = data.get('confirmation')

        if not username or not password:
            return JsonResponse({"error": "username and password are required"}, status=400)

        if password != confirmation:
            return JsonResponse({"error": "passwords do not match"}, status=400)

        if len(password) < 4:
            return JsonResponse({"error": "password must be at least 4 characters long"}, status=400)
        
        # Check if user already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "username already exists"}, status=400)
        
        # Create user
        user = User.objects.create_user(username=username, password=password)
        
        # Auto login after registration
        login(request, user)

        return JsonResponse({
             'user': {
                  'id': user.id,
                  'username': user.username,
             },
             'message': 'Registration successful'
        })
    
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON data"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    
    try:
        # Parse JSON data manually
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        # Validate input
        if not username or not password:
            return JsonResponse({
                'error': 'Username and password are required'
            }, status=400)
        
        # Authenticate user
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_active:
                login(request, user)
                return JsonResponse({
                    'user': {
                        'id': user.id,
                        'username': user.username,
                    },
                    'message': 'Login successful'
                })
            else:
                return JsonResponse({
                    'error': 'Account is disabled'
                }, status=400)
        else:
            return JsonResponse({
                'error': 'Invalid credentials'
            }, status=400)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)     

@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"message": "Successfully logged out"})

