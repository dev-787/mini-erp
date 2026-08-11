// Company Registration API utilities

export const registerCompany = async ({ companyName, adminName, email, password }) => {
  // Replace with actual API call when backend endpoint is ready
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        token: 'mock-jwt-token',
        user: {
          id: '1',
          name: adminName,
          email,
          role: 'ADMIN',
          companyName,
          mustChangePassword: false,
        },
      });
    }, 500);
  });
};
