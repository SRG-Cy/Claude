"""Sample answers used when no HF_TOKEN is set, so the app can be tried offline.

They match the "Try an example" texts in static/app.js.
"""

from datetime import date, timedelta


def _in_days(n):
    return (date.today() + timedelta(days=n)).isoformat()


def analysis(mode):
    # Built on each call so demo deadlines stay relative to today.
    return {
        "letter": {
            "title": "Electricity bill overdue: disconnection notice",
            "sender": "City Power Distribution Ltd.",
            "summary": "You have not paid your last electricity bill. "
            "If you do not pay by the deadline, they will cut your power and charge a reconnection fee.",
            "urgency": "high",
            "deadlines": [
                {"what": "Pay the overdue bill to avoid disconnection", "date": _in_days(12), "date_text": "within 15 days of this notice"},
                {"what": "Raise a complaint if you think the bill is wrong", "date": _in_days(7), "date_text": "within 10 days"},
            ],
            "money": [
                {"amount": "₹4,860", "what": "Overdue bill for August–September", "due": "within 15 days"},
                {"amount": "₹250", "what": "Late payment charge", "due": "added to next bill"},
                {"amount": "₹500", "what": "Reconnection fee, only if power is cut", "due": "before reconnection"},
            ],
            "actions": [
                "Check the meter reading on the bill against your meter.",
                "Pay ₹4,860 online, at the office, or by UPI using consumer number 1029-4471.",
                "Keep the payment receipt.",
                "If the bill is wrong, file a complaint at the customer care office within 10 days.",
            ],
            "documents": ["Consumer number 1029-4471", "Previous bill and payment receipt", "Photo of your current meter reading"],
            "red_flags": [
                "Only pay through the official website, app or office. They will never ask for payment to a personal UPI ID.",
                "Power can be disconnected after the deadline, so act soon.",
            ],
            "reply_options": ["Ask for more time to pay", "Dispute the bill amount", "Tell them I have already paid"],
        },
        "terms": {
            "title": "SnapStream Terms of Service",
            "summary": "SnapStream is a video app with a 7-day free trial that turns into a paid yearly plan automatically. "
            "They can use the videos you upload and share your data with advertisers.",
            "fairness_score": 4,
            "verdict": "Watch out: auto-renewal, no refunds, and wide rights over your videos.",
            "you_agree_to": [
                "Your free trial becomes a ₹1,499/year plan unless you cancel at least 24 hours before it ends.",
                "Any dispute goes to private arbitration, not to a court.",
                "They can change these terms at any time, and continuing to use the app means you accept the changes.",
            ],
            "data_collected": ["Name, email and phone number", "Precise location", "Contacts (if you allow it)", "What you watch and for how long", "Device ID"],
            "data_shared_with": ["Advertising partners", "Analytics companies", "Any company that buys SnapStream"],
            "money_and_renewal": ["7-day free trial", "Auto-renews yearly at ₹1,499", "No refunds for partial years", "Prices can rise with 30 days' notice"],
            "how_to_cancel": "Settings → Subscription → Cancel, at least 24 hours before renewal. Deleting the app does not cancel it.",
            "your_rights": ["Ask for a copy of your data", "Ask them to delete your account and data"],
            "red_flags": [
                "They get a worldwide, free licence to use, edit and show your videos, even in ads.",
                "You give up the right to join a class-action lawsuit.",
                "No refunds, even if you forget to cancel.",
            ],
        },
        "asks": {
            "title": "QuickLoan app sign-up request",
            "summary": "This loan app asks for much more than a loan needs, including your contacts, photos and an OTP. "
            "Asking for an OTP and full contact access is a common sign of a predatory or fake loan app.",
            "overall_risk": "high",
            "items": [
                {"item": "Full name and phone number", "verdict": "needed", "why_they_ask": "To create your account and contact you.", "risk": "Low; normal for any service.", "tip": "Fine to share."},
                {"item": "PAN card", "verdict": "optional", "why_they_ask": "Real lenders must check your identity (KYC).", "risk": "Can be misused for fake loans in your name.", "tip": "Only share with RBI-registered lenders. Check the lender's name on the RBI website first."},
                {"item": "Access to all phone contacts", "verdict": "avoid", "why_they_ask": "Shady loan apps message your family and friends to shame you into paying.", "risk": "Harassment of people you know.", "tip": "Deny this permission. A genuine lender does not need it."},
                {"item": "Access to photos and gallery", "verdict": "avoid", "why_they_ask": "Not needed for a loan.", "risk": "Your private photos could be misused for blackmail.", "tip": "Deny this permission."},
                {"item": "The OTP sent to your phone", "verdict": "avoid", "why_they_ask": "To take over your accounts or approve a payment.", "risk": "Someone can empty your bank account or take over your UPI.", "tip": "Never share an OTP with anyone, even if they say they are from a bank."},
            ],
            "safer_choices": [
                "Check whether the lender is registered with the RBI before applying.",
                "Use loans from your bank's own app instead.",
                "Turn off contact and gallery permissions in your phone settings.",
            ],
            "red_flags": ["Asks for an OTP", "Wants contacts and gallery access", "Promises instant loans with no checks"],
        },
    }[mode]


def reply(reply_type, name):
    return {
        "subject": f"Request regarding consumer no. 1029-4471: {reply_type}",
        "body": (
            "Dear Sir/Madam,\n\n"
            "I am writing about the disconnection notice for consumer number 1029-4471 "
            "for the overdue amount of ₹4,860.\n\n"
            f"Request: {reply_type}.\n\n"
            "I kindly ask you to consider this request and not disconnect the supply while it is reviewed. "
            "Please let me know if you need any further documents.\n\n"
            f"Thank you,\n{name}\n[your phone number]\n\n"
            "(This is a demo reply. Add an HF_TOKEN to get a reply written by the AI for your letter.)"
        ),
    }
