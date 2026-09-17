#[repr(C)]
struct DataBlob {
    cb_data: u32,
    pb_data: *mut u8,
}

#[cfg(target_os = "windows")]
mod sys {
    use super::DataBlob;
    use std::ptr::{null, null_mut};

    #[link(name = "crypt32")]
    extern "system" {
        fn CryptProtectData(
            p_data_in: *const DataBlob,
            sz_data_descr: *const u16,
            p_optional_entropy: *const DataBlob,
            pv_reserved: *mut std::ffi::c_void,
            p_prompt_struct: *mut std::ffi::c_void,
            dw_flags: u32,
            p_data_out: *mut DataBlob,
        ) -> i32;

        fn CryptUnprotectData(
            p_data_in: *const DataBlob,
            ppsz_data_descr: *mut *mut u16,
            p_optional_entropy: *const DataBlob,
            pv_reserved: *mut std::ffi::c_void,
            p_prompt_struct: *mut std::ffi::c_void,
            dw_flags: u32,
            p_data_out: *mut DataBlob,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn LocalFree(h_mem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
    }

    pub fn protect_bytes(data: &[u8]) -> Result<Vec<u8>, String> {
        let in_blob = DataBlob {
            cb_data: data.len() as u32,
            pb_data: data.as_ptr() as *mut u8,
        };
        let mut out_blob = DataBlob {
            cb_data: 0,
            pb_data: null_mut(),
        };

        // CRYPTPROTECT_UI_FORBIDDEN = 0x1
        let ret = unsafe {
            CryptProtectData(
                &in_blob,
                null(),
                null(),
                null_mut(),
                null_mut(),
                0x1,
                &mut out_blob,
            )
        };

        if ret == 0 || out_blob.pb_data.is_null() {
            return Err("Windows DPAPI CryptProtectData failed".to_string());
        }

        let slice = unsafe {
            std::slice::from_raw_parts(out_blob.pb_data, out_blob.cb_data as usize).to_vec()
        };
        unsafe {
            LocalFree(out_blob.pb_data as *mut std::ffi::c_void);
        }
        Ok(slice)
    }

    pub fn unprotect_bytes(data: &[u8]) -> Result<Vec<u8>, String> {
        let in_blob = DataBlob {
            cb_data: data.len() as u32,
            pb_data: data.as_ptr() as *mut u8,
        };
        let mut out_blob = DataBlob {
            cb_data: 0,
            pb_data: null_mut(),
        };

        // CRYPTPROTECT_UI_FORBIDDEN = 0x1
        let ret = unsafe {
            CryptUnprotectData(
                &in_blob,
                null_mut(),
                null(),
                null_mut(),
                null_mut(),
                0x1,
                &mut out_blob,
            )
        };

        if ret == 0 || out_blob.pb_data.is_null() {
            return Err("Windows DPAPI CryptUnprotectData failed to decrypt key".to_string());
        }

        let slice = unsafe {
            std::slice::from_raw_parts(out_blob.pb_data, out_blob.cb_data as usize).to_vec()
        };
        unsafe {
            LocalFree(out_blob.pb_data as *mut std::ffi::c_void);
        }
        Ok(slice)
    }
}

#[cfg(not(target_os = "windows"))]
mod sys {
    pub fn protect_bytes(_data: &[u8]) -> Result<Vec<u8>, String> {
        Err("Windows DPAPI is only supported on Windows".to_string())
    }

    pub fn unprotect_bytes(_data: &[u8]) -> Result<Vec<u8>, String> {
        Err("Windows DPAPI is only supported on Windows".to_string())
    }
}

pub fn protect(data: &[u8]) -> Result<Vec<u8>, String> {
    sys::protect_bytes(data)
}

pub fn unprotect(data: &[u8]) -> Result<Vec<u8>, String> {
    sys::unprotect_bytes(data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "windows")]
    fn roundtrip_dpapi_protection() {
        let original = b"freelancedesk_super_secret_master_key_123456";
        let protected = protect(original).expect("Protect should succeed");
        assert_ne!(protected, original);

        let restored = unprotect(&protected).expect("Unprotect should succeed");
        assert_eq!(restored, original);
    }

    #[test]
    #[cfg(not(target_os = "windows"))]
    fn non_windows_explicitly_errors() {
        assert!(protect(b"test").is_err());
        assert!(unprotect(b"test").is_err());
    }
}
