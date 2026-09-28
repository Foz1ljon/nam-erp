package uz.nammotors.calls.sync;

/** One row of the phone's call log. */
public final class PhoneCall {

    public final String id;
    public final String number;
    public final String name;
    public final boolean inContacts;
    /** in | out | missed | rejected */
    public final String direction;
    public final long startedAt;
    public final long duration;

    public PhoneCall(String id, String number, String name, boolean inContacts, String direction, long startedAt, long duration) {
        this.id = id;
        this.number = number;
        this.name = name;
        this.inContacts = inContacts;
        this.direction = direction;
        this.startedAt = startedAt;
        this.duration = duration;
    }
}
