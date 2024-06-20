<?php

namespace App\Http\Controllers;

use App\Traits\FileUploadTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class UserProfileController extends Controller
{
    use FileUploadTrait;

    public function update(Request $request)
    {
        $request->validate([
            'avatar' => ['nullable', 'image', 'max:500'],
            'name' => ['required', 'string', 'max:50'],
            'user_id' => ['required', 'string', 'max:50', 'unique:users,user_name,'.auth()->user()->id],
            'email' => ['required', 'email', 'max:100'],
        ]);

        $avatarPath = $this->uploadFile($request, 'avatar');

        $user = Auth::user();
        if ($avatarPath) $user->avatar = $avatarPath;
        $user->name = $request->name;
        $user->user_name = $request->user_id;
        $user->email = $request->email;

        if ($request->filled('current_password')) {
            $request->validate([
                'current_password' => ['required'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ]);

            // Verify current password
            if (!Hash::check($request->current_password, $user->password)) {
                return notfy().error(response()->json(['errors' => ['current_password' => ['Current password is incorrect.']]], 422));
            }

            $user->password = bcrypt($request->password);
        }

        $user->save();

        notyf()->addSuccess('Updated Successfully.');

        return response(['message' => 'Updated Successfully!'], 200);
    }
}
